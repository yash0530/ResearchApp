import { describe, expect, it } from "vitest";
import { getLaunchPlan } from "@/lib/launch";

describe("getLaunchPlan", () => {
  it("prefills Claude Desktop", () => {
    const plan = getLaunchPlan("CLAUDE", "hello world");
    expect(plan.mode).toBe("prefill_url");
    expect(plan.url).toBe("claude://claude.ai/new?q=hello%20world");
  });

  it("opens web apps with copy fallback", () => {
    expect(getLaunchPlan("PERPLEXITY", "x").mode).toBe("open_and_copy");
    expect(getLaunchPlan("CHATGPT", "x").url).toBe("https://chatgpt.com/");
    expect(getLaunchPlan("GEMINI", "x").url).toBe("https://gemini.google.com/app");
  });

  it("copies only for manual mode", () => {
    const plan = getLaunchPlan("MANUAL", "x");
    expect(plan.mode).toBe("copy_only");
    expect(plan.url).toBeNull();
  });
});
