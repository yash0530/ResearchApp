import { describe, expect, it } from "vitest";
import { parseSignalDeskBlock } from "@/lib/parser";

describe("parseSignalDeskBlock", () => {
  it("parses a valid Signal Desk block", () => {
    const parsed = parseSignalDeskBlock(`
Readable report first.

SIGNAL_DESK_DATA_START
THEME|theme=memory_storage|cycle=heating_up|crowding=high|confidence=4|summary=HBM tightness
TICKER|ticker=MU|theme=memory_storage|sentiment=bullish|confidence=4|role=HBM beneficiary
CLAIM|text=HBM demand is supply constrained|ticker=MU|theme=memory_storage|confidence=4|importance=high|source_url=https://example.com
RISK|text=DRAM pricing rolls over|ticker=MU|theme=memory_storage|severity=high|timeframe=next_quarter
CATALYST|text=Guide moves higher|ticker=MU|theme=memory_storage|importance=medium|timeframe=next_quarter
TARGET|ticker=MU|firm=UBS|rating=buy|target=155|previous_target=140|date=2026-05-20
WATCH|text=Gross margin guide|ticker=MU|theme=memory_storage|timeframe=next_2_quarters
VERDICT|ticker=MU|theme=memory_storage|stance=RESEARCH_NOW|priority=4|horizon=next_12_months|rationale=Strong structural driver
DISCOVERY_TICKER|ticker=ALAB|company=Astera Labs|theme=networking_optics_interconnect|reason=connectivity exposure
QUESTION|text=Is this thesis too dependent on one hyperscaler capex cycle?|ticker=MU|theme=memory_storage
SIGNAL_DESK_DATA_END
`);

    expect(parsed.themeSignals).toHaveLength(1);
    expect(parsed.tickerMentions[0]).toMatchObject({ ticker: "MU", sentiment: "BULLISH" });
    expect(parsed.claims[0].importance).toBe("HIGH");
    expect(parsed.risks[0].severity).toBe("HIGH");
    expect(parsed.analystTargets[0].target).toBe(155);
    expect(parsed.verdicts).toHaveLength(1);
    expect(parsed.verdicts[0]).toMatchObject({ ticker: "MU", stance: "RESEARCH_NOW", priority: 4, rationale: "Strong structural driver" });
    expect(parsed.discoveries[0].symbol).toBe("ALAB");
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0]).toMatchObject({ text: "Is this thesis too dependent on one hyperscaler capex cycle?", ticker: "MU" });
  });

  it("ignores malformed lines without failing", () => {
    const parsed = parseSignalDeskBlock(`
SIGNAL_DESK_DATA_START
CLAIM|ticker=MU|confidence=4
TOTALLY_UNKNOWN|foo=bar
TARGET|ticker=MU|target=not-a-number
SIGNAL_DESK_DATA_END
`);

    expect(parsed.claims).toHaveLength(0);
    expect(parsed.analystTargets).toHaveLength(1);
    expect(parsed.analystTargets[0].target).toBeUndefined();
    expect(parsed.ignoredLines).toHaveLength(2);
  });

  it("returns empty arrays when no block exists", () => {
    const parsed = parseSignalDeskBlock("plain old text");
    expect(parsed.lineCount).toBe(0);
    expect(parsed.claims).toEqual([]);
  });
});
