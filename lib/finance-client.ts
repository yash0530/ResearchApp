/**
 * finance-client.ts
 *
 * Typed HTTP client for the sibling Flask finance API at FINANCE_API_URL.
 * Every exported function returns null on ANY failure (network, timeout, non-2xx,
 * shape mismatch). Never throws.
 *
 * Timeout: 2.5 s via AbortController.
 */

export const FINANCE_API_BASE =
  process.env.FINANCE_API_URL ?? "http://localhost:5001";

const TIMEOUT_MS = 2500;

// ── Normalised types ─────────────────────────────────────────────────────────

export type GroundedTicker = {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  price: number | null;
  yearChangePct: number | null;
  dayChangePct: number | null;
  forwardPe: number | null;
  trailingPe: number | null;
  beta: number | null;
  marketCap: number | null;
  analystTarget: number | null;
  sectorMomentumPercentile: number | null;
  forwardPeSectorAvg: number | null;
  spotlightTags: string[];
  source: "finance";
  asOf: Date;
};

export type GroundedQuarter = {
  quarter: string;
  periodEnd: Date | null;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  grossMargin: number | null;
  fcf: number | null;
  capex: number | null;
};

// ── Internal helpers ─────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function safeGet<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(`${FINANCE_API_BASE}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[$,%]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Build spotlight tags from the sp500 company row.
// The Flask API does not expose a dedicated spotlight endpoint per ticker.
// We derive the tags from the numeric fields that match the finance-side
// spotlight_sections logic (same thresholds used in app.py).
function deriveSpotlightTags(row: Record<string, unknown>): string[] {
  const tags: string[] = [];
  const yearChange = num(row.year_change);
  const revenueGrowth = num(row.revenue_growth);
  const forwardPe = num(row.forward_pe);
  const trailingPe = num(row.trailing_pe);
  const peRatio = num(row.pe_ratio);
  const profitMargin = num(row.profit_margin);
  const dividendYield = num(row.dividend_yield);
  const beta = num(row.beta);
  const marketCap = num(row.market_cap);

  if (revenueGrowth !== null && revenueGrowth > 0.15 && yearChange !== null && yearChange > 0) {
    tags.push("Growth Stock");
  }
  if (yearChange !== null && yearChange > 0.2) {
    tags.push("Hot Stock");
  }
  if (forwardPe !== null && forwardPe > 0 && forwardPe < 15 && trailingPe !== null && trailingPe > 1) {
    tags.push("Value Play");
  }
  if (peRatio !== null && peRatio > 1.2) {
    tags.push("Momentum Leader");
  }
  if (profitMargin !== null && profitMargin > 0.15 && revenueGrowth !== null && revenueGrowth > 0.05) {
    tags.push("Quality Gem");
  }
  if (dividendYield !== null && dividendYield > 0.03) {
    tags.push("Dividend Champion");
  }
  if (beta !== null && beta > 0 && beta < 0.8) {
    tags.push("Low Volatility");
  }
  if (marketCap !== null && marketCap > 200e9) {
    tags.push("Mega Cap");
  }
  if (yearChange !== null && yearChange < -0.1 && forwardPe !== null && forwardPe > 0) {
    tags.push("Turnaround Play");
  }
  if (beta !== null && beta > 1.5) {
    tags.push("High Beta");
  }
  return tags;
}

// Compute sector momentum percentile from the sp500 companies list.
function computeSectorMomentumPercentile(
  rows: Array<Record<string, unknown>>,
  yearChange: number | null,
): number | null {
  if (yearChange === null) return null;
  const changes = rows
    .map((r) => num(r.year_change))
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  if (changes.length === 0) return null;
  const rank = changes.filter((v) => v <= yearChange).length;
  return Math.round((rank / changes.length) * 100);
}

// Compute sector forward P/E average from the sector companies list.
function computeForwardPeSectorAvg(rows: Array<Record<string, unknown>>): number | null {
  const pes = rows
    .map((r) => num(r.forward_pe))
    .filter((v): v is number => v !== null && v > 0 && v < 200);

  if (pes.length === 0) return null;
  return Math.round((pes.reduce((a, b) => a + b, 0) / pes.length) * 100) / 100;
}

// Fetch the universal per-ticker header (works for any US ticker). ToolResult → data{}.
async function fetchStockHeader(symbol: string): Promise<Record<string, unknown> | null> {
  const res = await safeGet<{ data?: Record<string, unknown> }>(
    `/api/stock/${encodeURIComponent(symbol)}/header`,
  );
  const d = res?.data;
  return d && typeof d === "object" ? d : null;
}

// ── Exported API ─────────────────────────────────────────────────────────────

/**
 * Fetch a single stock and enrich with percentile/sector data if in S&P 500.
 * Returns null if the ticker is not found or the server is unreachable.
 */
export async function getGroundedTicker(symbol: string): Promise<GroundedTicker | null> {
  try {
    const upper = symbol.toUpperCase().trim();
    const [header, sp] = await Promise.all([
      fetchStockHeader(upper),
      safeGet<Record<string, unknown>>(`/api/market/sp500/company/${encodeURIComponent(upper)}`),
    ]);

    // The header endpoint echoes the ticker as company_name with all-null
    // financials for nonexistent symbols, so it is NOT a valid existence check.
    // Treat the header as real only if it carries actual numeric data.
    const headerHasData =
      header != null &&
      (num(header.current_price) !== null || num(header.market_cap) !== null);
    const usableHeader = headerHasData ? header : null;

    const hasSpError = !sp || typeof sp !== "object" || "error" in sp;
    if (!usableHeader && hasSpError) return null;

    const spRow = hasSpError ? null : sp;
    const sector = str(usableHeader?.sector) ?? str(spRow?.sector);
    const yearChange = num(spRow?.year_change);

    let sectorMomentumPercentile: number | null = null;
    let forwardPeSectorAvg: number | null = null;

    if (sector) {
      const encodedSector = encodeURIComponent(sector);
      const data = await safeGet<{ data?: Array<Record<string, unknown>> }>(
        `/api/market/sp500/companies/${encodedSector}`,
      );
      const sectorCompanies = data?.data;
      if (Array.isArray(sectorCompanies) && sectorCompanies.length > 0) {
        sectorMomentumPercentile = computeSectorMomentumPercentile(sectorCompanies, yearChange);
        forwardPeSectorAvg = computeForwardPeSectorAvg(sectorCompanies);
      }
    }

    const companyName = str(usableHeader?.company_name) ?? str(spRow?.company_name);
    const price = num(usableHeader?.current_price) ?? num(spRow?.current_price_fmt) ?? num(spRow?.price);
    const forwardPe = num(usableHeader?.forward_pe) ?? num(spRow?.forward_pe);
    const trailingPe = num(usableHeader?.trailing_pe) ?? num(usableHeader?.pe_ratio) ?? num(spRow?.trailing_pe);
    const beta = num(usableHeader?.beta) ?? num(spRow?.beta);
    const marketCap = num(usableHeader?.market_cap) ?? num(spRow?.market_cap);
    const analystTarget = num(usableHeader?.analyst_target);
    const yearChangePct = yearChange !== null ? Math.round(yearChange * 10000) / 100 : null;
    const dayChangePct = usableHeader ? num(usableHeader.day_change_percent) : null;

    const spotlightTags = spRow ? deriveSpotlightTags(spRow) : [];

    return {
      symbol: upper,
      companyName,
      sector,
      price,
      yearChangePct,
      dayChangePct,
      forwardPe,
      trailingPe,
      beta,
      marketCap,
      analystTarget,
      sectorMomentumPercentile,
      forwardPeSectorAvg,
      spotlightTags,
      source: "finance",
      asOf: new Date(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch one-year price history bars via /api/chart/<ticker> and return chronologically sorted array.
 */
export async function getGroundedChart(symbol: string): Promise<Array<{ date: string; close: number }> | null> {
  const res = await safeGet<{ data?: any }>(`/api/chart/${encodeURIComponent(symbol)}?range=1y`);
  const bars = res?.data?.bars ?? res?.data?.prices ?? res?.data?.candles ?? res?.data;
  if (!Array.isArray(bars) || bars.length === 0) return null;
  const rows = bars
    .map((b: any) => ({
      date: str(b.date ?? b.t ?? b.timestamp ?? b.time) ?? "",
      close: num(b.close ?? b.c ?? b.adj_close) ?? NaN,
    }))
    .filter((r) => r.date && Number.isFinite(r.close))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return rows.length ? rows : null;
}

/**
 * Fetch multi-quarter financial trends from /api/stock/<ticker>/fundamentals.
 * Returns null if unavailable.
 */
export async function getGroundedQuarters(
  symbol: string,
): Promise<GroundedQuarter[] | null> {
  try {
    const upper = symbol.toUpperCase().trim();
    // The fundamentals endpoint wraps trends in a ToolResult: trends.data.quarters[].
    const data = await safeGet<{ trends?: { data?: { quarters?: Array<Record<string, unknown>> } } }>(
      `/api/stock/${encodeURIComponent(upper)}/fundamentals`,
    );
    const quarters = data?.trends?.data?.quarters;
    if (!Array.isArray(quarters) || quarters.length === 0) return null;

    const results: GroundedQuarter[] = [];
    for (const q of quarters.slice(0, 8)) {
      const dateStr = str(q.date);
      const periodEnd = dateStr ? new Date(dateStr) : null;

      // quarter_label looks like "Q2 2025"; convert to "2025Q2"
      const rawLabel = str(q.quarter_label);
      let quarter = dateStr ? dateToQuarterLabel(dateStr) : null;
      if (!quarter && rawLabel) {
        quarter = normaliseQuarterLabel(rawLabel);
      }
      if (!quarter) continue;

      results.push({
        quarter,
        periodEnd: periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd : null,
        revenue: num(q.revenue) ?? num(q.total_revenue),
        grossProfit: num(q.gross_profit),
        operatingIncome: num(q.operating_income),
        netIncome: num(q.net_income),
        grossMargin: num(q.gross_margin),
        fcf: num(q.fcf),
        capex: num(q.capex),
      });
    }

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

/**
 * Trigger a fresh S&P 500 snapshot refresh on the finance server.
 * Returns false on any failure.
 */
export async function refreshSp500(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${FINANCE_API_BASE}/api/market/refresh-sp500`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

/**
 * Quick liveness check — returns true if the finance server is reachable.
 */
export async function financeHealthy(): Promise<boolean> {
  try {
    const data = await safeGet<{ status?: string }>("/api/health");
    return data !== null && typeof data === "object";
  } catch {
    return false;
  }
}

/**
 * Fetch daily movers (gainers & losers) from /api/terminal/movers using safeGet.
 */
export async function getMarketMovers(topN: number = 5): Promise<{ gainers: any[]; losers: any[] } | null> {
  try {
    const data = await safeGet<any>(`/api/terminal/movers?top_n=${topN}`);
    const rawMovers = data?.movers ?? data?.data ?? data;
    if (rawMovers && (rawMovers.gainers || rawMovers.losers)) {
      return {
        gainers: Array.isArray(rawMovers.gainers) ? rawMovers.gainers : [],
        losers: Array.isArray(rawMovers.losers) ? rawMovers.losers : [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function dateToQuarterLabel(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/** Convert "Q2 2025" → "2025Q2" */
function normaliseQuarterLabel(label: string): string | null {
  const m = label.match(/Q(\d)\s+(\d{4})/i);
  if (m) return `${m[2]}Q${m[1]}`;
  return null;
}
