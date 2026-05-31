export const SOURCE_APPS = ["PERPLEXITY", "CLAUDE", "GEMINI", "CHATGPT", "MANUAL"] as const;
export const CADENCES = ["DAILY", "WEEKLY", "MONTHLY", "AD_HOC"] as const;
export const RESEARCH_STATUSES = ["ACTIVE", "STALE", "INCORRECT", "ARCHIVED"] as const;
export const RUN_STATUSES = ["DRAFT", "COPIED", "LAUNCHED", "OUTPUT_SAVED", "PARSED"] as const;
export const LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export const SENTIMENTS = ["BULLISH", "NEUTRAL", "BEARISH", "MIXED"] as const;
export const CYCLE_STAGES = ["DORMANT", "EMERGING", "HEATING_UP", "CROWDED", "ROLLING_OVER"] as const;
export const DISCOVERY_STATUSES = ["NEW", "ACCEPTED", "REJECTED", "IGNORED"] as const;

export const LOOKBACKS = ["24h", "7d", "30d", "90d", "6m", "ytd"] as const;
export const FINANCIAL_WINDOWS = ["last_6_quarters", "last_8_quarters", "ttm"] as const;
export const HORIZONS = ["next_month", "next_quarter", "next_12_months"] as const;

export const SOURCE_APP_LABELS: Record<(typeof SOURCE_APPS)[number], string> = {
  PERPLEXITY: "Perplexity",
  CLAUDE: "Claude",
  GEMINI: "Gemini",
  CHATGPT: "ChatGPT",
  MANUAL: "Manual",
};

export const RESEARCH_STATUS_LABELS: Record<(typeof RESEARCH_STATUSES)[number], string> = {
  ACTIVE: "Active",
  STALE: "Stale",
  INCORRECT: "Incorrect",
  ARCHIVED: "Archived",
};

export function prettifyEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
