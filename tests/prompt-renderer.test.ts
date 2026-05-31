import { describe, expect, it } from "vitest";
import { renderPrompt } from "@/lib/prompt-renderer";

describe("renderPrompt", () => {
  it("replaces supported placeholders", () => {
    const rendered = renderPrompt({
      body: "{{themes}} {{tickers}} {{lookback}} {{financial_window}} {{horizon}} {{local_context}} {{unknown}}",
      themes: [
        {
          id: "1",
          slug: "memory_storage",
          name: "Memory & Storage",
          description: "",
          color: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      values: {
        sourceApp: "PERPLEXITY",
        promptTemplateId: "p1",
        themeSlugs: ["memory_storage"],
        tickers: ["MU"],
        lookback: "30d",
        financialWindow: "last_6_quarters",
        horizon: "next_12_months",
        researchType: "dashboard",
      },
      localContext: "LOCAL_TICKER|ticker=MU|price=100",
    });

    expect(rendered).toContain("memory_storage (Memory & Storage)");
    expect(rendered).toContain("MU");
    expect(rendered).toContain("30d");
    expect(rendered).toContain("last_6_quarters");
    expect(rendered).toContain("next_12_months");
    expect(rendered).toContain("LOCAL_TICKER|ticker=MU|price=100");
    expect(rendered).toContain("{{unknown}}");
  });
});
