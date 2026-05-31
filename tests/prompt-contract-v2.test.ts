import { describe, expect, it } from "vitest";
import { PROMPT_SEEDS } from "../lib/seed-prompts";
import { renderPrompt } from "../lib/prompt-renderer";
import { parseSignalDeskBlock } from "../lib/parser";

describe("Prompt Contract v2 & Seed Tests", () => {
  it("has exactly 6 active v2 prompts and 15 archived old prompts", () => {
    const active = PROMPT_SEEDS.filter((p) => !p.isArchived);
    const archived = PROMPT_SEEDS.filter((p) => p.isArchived);

    expect(active).toHaveLength(6);
    expect(archived).toHaveLength(15);
  });

  it("ensures required placeholders are present in all active prompts", () => {
    const active = PROMPT_SEEDS.filter((p) => !p.isArchived);
    const requiredPlaceholders = [
      "{{themes}}",
      "{{tickers}}",
      "{{lookback}}",
      "{{financial_window}}",
      "{{horizon}}",
      "{{local_context}}",
    ];

    for (const prompt of active) {
      for (const ph of requiredPlaceholders) {
        expect(prompt.body).toContain(ph);
      }
    }
  });

  it("ensures no fake URLs (example.com) are in active prompts", () => {
    const active = PROMPT_SEEDS.filter((p) => !p.isArchived);
    for (const prompt of active) {
      expect(prompt.body).not.toContain("example.com");
    }
  });

  it("replaces placeholders and includes exactly one parse block instruction on render", () => {
    const active = PROMPT_SEEDS.filter((p) => !p.isArchived);

    for (const prompt of active) {
      const rendered = renderPrompt({
        body: prompt.body,
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
          sourceApp: "CLAUDE",
          promptTemplateId: prompt.slug,
          themeSlugs: ["memory_storage"],
          tickers: ["MU"],
          lookback: "30d",
          financialWindow: "last_6_quarters",
          horizon: "next_12_months",
          researchType: "dashboard",
        },
        localContext: "LOCAL_TICKER|ticker=MU|price=100",
      });

      // Verify placeholders replaced
      expect(rendered).toContain("memory_storage (Memory & Storage)");
      expect(rendered).toContain("MU");
      expect(rendered).toContain("30d");
      expect(rendered).toContain("last_6_quarters");
      expect(rendered).toContain("next_12_months");
      expect(rendered).toContain("LOCAL_TICKER|ticker=MU|price=100");

      // Verify exactly two occurrences of literal strings SIGNAL_DESK_DATA_START and SIGNAL_DESK_DATA_END (one in instructions, one in example)
      const startCount = (rendered.match(/SIGNAL_DESK_DATA_START/g) || []).length;
      const endCount = (rendered.match(/SIGNAL_DESK_DATA_END/g) || []).length;
      expect(startCount).toBe(2);
      expect(endCount).toBe(2);
    }
  });

  it("all 6 active prompts contain all 6 required {{...}} placeholders", () => {
    const active = PROMPT_SEEDS.filter((p) => !p.isArchived);
    expect(active).toHaveLength(6);

    const requiredPlaceholders = [
      "{{themes}}",
      "{{tickers}}",
      "{{lookback}}",
      "{{financial_window}}",
      "{{horizon}}",
      "{{local_context}}",
    ];

    for (const prompt of active) {
      for (const ph of requiredPlaceholders) {
        expect(prompt.body, `${prompt.slug} missing placeholder ${ph}`).toContain(ph);
      }
    }
  });

  it("PARSE_CONTRACT example block parses with zero ignored lines and produces all required record types", () => {
    // Extract the SIGNAL_DESK example embedded in the first active prompt body.
    // The PARSE_CONTRACT string is shared across all active prompts, so any one of them works.
    const active = PROMPT_SEEDS.filter((p) => !p.isArchived);
    expect(active.length).toBeGreaterThan(0);

    const body = active[0].body;

    // Isolate just the example block (second occurrence of the markers — first is in the prose instruction).
    const allBlocks = [...body.matchAll(/SIGNAL_DESK_DATA_START([\s\S]*?)SIGNAL_DESK_DATA_END/gi)];
    // The contract embeds exactly one example block; there should be at least one match.
    expect(allBlocks.length).toBeGreaterThanOrEqual(1);

    // Use the last match, which is the example block at the end of the contract text.
    const lastMatch = allBlocks[allBlocks.length - 1];
    const syntheticBlock = `SIGNAL_DESK_DATA_START${lastMatch[1]}SIGNAL_DESK_DATA_END`;

    const parsed = parseSignalDeskBlock(syntheticBlock);

    // Zero ignored lines — every line in the example must be parseable by the parser.
    expect(parsed.ignoredLines, `Ignored lines: ${JSON.stringify(parsed.ignoredLines)}`).toHaveLength(0);

    // At least one of each required record type must be produced.
    expect(parsed.themeSignals.length, "themeSignals").toBeGreaterThanOrEqual(1);
    expect(parsed.tickerMentions.length, "tickerMentions").toBeGreaterThanOrEqual(1);
    expect(parsed.claims.length, "claims").toBeGreaterThanOrEqual(1);
    expect(parsed.risks.length, "risks").toBeGreaterThanOrEqual(1);
    expect(parsed.catalysts.length, "catalysts").toBeGreaterThanOrEqual(1);
    expect(parsed.analystTargets.length, "analystTargets").toBeGreaterThanOrEqual(1);
    expect(parsed.watchItems.length, "watchItems").toBeGreaterThanOrEqual(1);
    expect(parsed.verdicts.length, "verdicts").toBeGreaterThanOrEqual(1);
    expect(parsed.discoveries.length, "discoveries").toBeGreaterThanOrEqual(1);
    expect(parsed.questions.length, "questions").toBeGreaterThanOrEqual(1);
  });
});
