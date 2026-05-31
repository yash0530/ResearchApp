import { describe, it, expect, vi, afterEach, type MockInstance } from "vitest";
import {
  getGroundedTicker,
  financeHealthy,
  FINANCE_API_BASE,
} from "@/lib/finance-client";

// ── Sample data fixtures ──────────────────────────────────────────────────────

const SAMPLE_COMPANY_ROW = {
  ticker: "MU",
  company_name: "Micron Technology Inc",
  sector: "Information Technology",
  industry: "Semiconductors",
  forward_pe: 14.5,
  trailing_pe: 22.3,
  pe_ratio: 1.1,
  year_change: 0.312,          // 31.2 %
  beta: 1.35,
  market_cap: 118_000_000_000,
  current_price_fmt: 107.5,
  dividend_yield: 0.004,
  revenue_growth: 0.42,
  profit_margin: 0.18,
};

const SAMPLE_SECTOR_ROWS = {
  data: [
    { year_change: 0.1, forward_pe: 20 },
    { year_change: 0.2, forward_pe: 25 },
    { year_change: 0.312, forward_pe: 14.5 },  // MU's own change
    { year_change: 0.5, forward_pe: 30 },
    { year_change: -0.05, forward_pe: 18 },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOkResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function makeNotFoundResponse(): Response {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getGroundedTicker", () => {
  let fetchMock: MockInstance;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a sample S&P 500 company row into the normalised GroundedTicker shape", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/market/sp500/company/MU")) {
        return makeOkResponse(SAMPLE_COMPANY_ROW);
      }
      if (url.includes("/api/market/sp500/companies/")) {
        return makeOkResponse(SAMPLE_SECTOR_ROWS);
      }
      return makeNotFoundResponse();
    });

    const result = await getGroundedTicker("MU");

    expect(result).not.toBeNull();
    expect(result!.symbol).toBe("MU");
    expect(result!.companyName).toBe("Micron Technology Inc");
    expect(result!.sector).toBe("Information Technology");
    expect(result!.source).toBe("finance");
    expect(result!.forwardPe).toBe(14.5);
    expect(result!.trailingPe).toBe(22.3);
    expect(result!.beta).toBe(1.35);
    expect(result!.marketCap).toBe(118_000_000_000);
    expect(result!.price).toBe(107.5);
    // yearChangePct: 0.312 → 31.2 %
    expect(result!.yearChangePct).toBeCloseTo(31.2, 1);
    // spotlightTags should include at least Growth Stock (revenue_growth > 0.15 & year_change > 0)
    expect(result!.spotlightTags).toContain("Growth Stock");
    // should include Hot Stock (year_change > 0.20)
    expect(result!.spotlightTags).toContain("Hot Stock");
    // sector forward pe avg: (20 + 25 + 14.5 + 30 + 18) / 5 = 21.5
    expect(result!.forwardPeSectorAvg).toBeCloseTo(21.5, 1);
    // sectorMomentumPercentile: changes sorted: [-0.05, 0.1, 0.2, 0.312, 0.5]
    // MU is 0.312 → rank = 4 out of 5 → 80
    expect(result!.sectorMomentumPercentile).toBe(80);
    expect(result!.asOf).toBeInstanceOf(Date);
  });

  it("returns null when the finance server returns 404 (ticker not in S&P 500)", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(makeNotFoundResponse());

    const result = await getGroundedTicker("NONEXISTENT");
    expect(result).toBeNull();
  });

  it("returns null when fetch rejects (server is down)", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await getGroundedTicker("MU");
    expect(result).toBeNull();
  });

  it("returns null when fetch times out (AbortError)", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
    );

    const result = await getGroundedTicker("MU");
    expect(result).toBeNull();
  });

  it("handles missing optional fields gracefully (no throw)", async () => {
    // Minimal row — only ticker present; everything else absent.
    fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/market/sp500/company/")) {
        return makeOkResponse({ ticker: "XYZ" });
      }
      if (url.includes("/api/market/sp500/companies/")) {
        return makeOkResponse({ data: [] });
      }
      return makeNotFoundResponse();
    });

    const result = await getGroundedTicker("XYZ");
    // Company row exists (no "error" key) but sector is null, so sectorMomentumPercentile
    // and forwardPeSectorAvg must be null, not throw.
    expect(result).not.toBeNull();
    expect(result!.companyName).toBeNull();
    expect(result!.sector).toBeNull();
    expect(result!.sectorMomentumPercentile).toBeNull();
    expect(result!.forwardPeSectorAvg).toBeNull();
    expect(result!.spotlightTags).toEqual([]);
  });

  it("exports FINANCE_API_BASE defaulting to localhost:5001", () => {
    expect(FINANCE_API_BASE).toBe("http://localhost:5001");
  });
});

describe("financeHealthy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when /api/health responds with any JSON object", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeOkResponse({ status: "healthy" }),
    );
    expect(await financeHealthy()).toBe(true);
  });

  it("returns false when fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    expect(await financeHealthy()).toBe(false);
  });
});
