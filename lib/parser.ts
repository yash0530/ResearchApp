import { CYCLE_STAGES, LEVELS, SENTIMENTS, VERDICT_STANCES } from "./enums";

export type ParsedSignalBlock = {
  claims: ParsedClaimInput[];
  risks: ParsedRiskInput[];
  catalysts: ParsedCatalystInput[];
  tickerMentions: ParsedTickerMentionInput[];
  analystTargets: ParsedAnalystTargetInput[];
  themeSignals: ParsedThemeSignalInput[];
  watchItems: ParsedWatchItemInput[];
  verdicts: ParsedVerdictInput[];
  discoveries: ParsedDiscoveryInput[];
  questions: ParsedQuestionInput[];
  lineCount: number;
  ignoredLines: string[];
};

export type ParsedClaimInput = {
  text: string;
  ticker?: string;
  themeSlug?: string;
  confidence?: number;
  importance?: "LOW" | "MEDIUM" | "HIGH";
  sourceUrl?: string;
};

export type ParsedRiskInput = {
  text: string;
  ticker?: string;
  themeSlug?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH";
  timeframe?: string;
  sourceUrl?: string;
};

export type ParsedCatalystInput = {
  text: string;
  ticker?: string;
  themeSlug?: string;
  importance?: "LOW" | "MEDIUM" | "HIGH";
  timeframe?: string;
  sourceUrl?: string;
};

export type ParsedTickerMentionInput = {
  ticker: string;
  themeSlug?: string;
  sentiment?: "BULLISH" | "NEUTRAL" | "BEARISH" | "MIXED";
  confidence?: number;
  role?: string;
};

export type ParsedAnalystTargetInput = {
  ticker: string;
  firm?: string;
  rating?: string;
  target?: number;
  previousTarget?: number;
  date?: Date;
  sourceUrl?: string;
};

export type ParsedThemeSignalInput = {
  themeSlug: string;
  cycle?: "DORMANT" | "EMERGING" | "HEATING_UP" | "CROWDED" | "ROLLING_OVER";
  crowding?: "LOW" | "MEDIUM" | "HIGH";
  confidence?: number;
  summary?: string;
};

export type ParsedWatchItemInput = {
  text: string;
  ticker?: string;
  themeSlug?: string;
  timeframe?: string;
};

export type ParsedVerdictInput = {
  ticker?: string;
  themeSlug?: string;
  stance: "RESEARCH_NOW" | "WATCH" | "DEFER" | "AVOID";
  priority?: number;
  horizon?: string;
  rationale: string;
};

export type ParsedDiscoveryInput = {
  symbol: string;
  companyName?: string;
  suggestedTheme?: string;
  reason?: string;
  sourceLine: string;
};

export type ParsedQuestionInput = {
  text: string;
  ticker?: string;
  themeSlug?: string;
};

type KeyValues = Record<string, string>;

const BLOCK_RE = /SIGNAL_DESK_DATA_START([\s\S]*?)SIGNAL_DESK_DATA_END/i;

export function parseSignalDeskBlock(rawOutput: string): ParsedSignalBlock {
  const empty: ParsedSignalBlock = {
    claims: [],
    risks: [],
    catalysts: [],
    tickerMentions: [],
    analystTargets: [],
    themeSignals: [],
    watchItems: [],
    verdicts: [],
    discoveries: [],
    questions: [],
    lineCount: 0,
    ignoredLines: [],
  };

  const match = rawOutput.match(BLOCK_RE);
  if (!match?.[1]) return empty;

  const lines = match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    empty.lineCount += 1;
    const [typeRaw, ...segments] = line.split("|");
    const type = typeRaw?.trim().toUpperCase();
    const fields = parseFields(segments);

    try {
      switch (type) {
        case "THEME": {
          const themeSlug = cleanTheme(fields.theme);
          if (!themeSlug) throw new Error("missing theme");
          empty.themeSignals.push({
            themeSlug,
            cycle: normalizeCycle(fields.cycle),
            crowding: normalizeLevel(fields.crowding),
            confidence: normalizeConfidence(fields.confidence),
            summary: clean(fields.summary),
          });
          break;
        }
        case "TICKER": {
          const ticker = cleanTicker(fields.ticker || fields.symbol);
          if (!ticker) throw new Error("missing ticker");
          empty.tickerMentions.push({
            ticker,
            themeSlug: cleanTheme(fields.theme),
            sentiment: normalizeSentiment(fields.sentiment),
            confidence: normalizeConfidence(fields.confidence),
            role: clean(fields.role),
          });
          break;
        }
        case "CLAIM": {
          const text = clean(fields.text);
          if (!text) throw new Error("missing text");
          empty.claims.push({
            text,
            ticker: cleanTicker(fields.ticker),
            themeSlug: cleanTheme(fields.theme),
            confidence: normalizeConfidence(fields.confidence),
            importance: normalizeLevel(fields.importance),
            sourceUrl: clean(fields.source_url || fields.sourceUrl),
          });
          break;
        }
        case "RISK": {
          const text = clean(fields.text);
          if (!text) throw new Error("missing text");
          empty.risks.push({
            text,
            ticker: cleanTicker(fields.ticker),
            themeSlug: cleanTheme(fields.theme),
            severity: normalizeLevel(fields.severity),
            timeframe: clean(fields.timeframe),
            sourceUrl: clean(fields.source_url || fields.sourceUrl),
          });
          break;
        }
        case "CATALYST": {
          const text = clean(fields.text);
          if (!text) throw new Error("missing text");
          empty.catalysts.push({
            text,
            ticker: cleanTicker(fields.ticker),
            themeSlug: cleanTheme(fields.theme),
            importance: normalizeLevel(fields.importance),
            timeframe: clean(fields.timeframe),
            sourceUrl: clean(fields.source_url || fields.sourceUrl),
          });
          break;
        }
        case "TARGET": {
          const ticker = cleanTicker(fields.ticker || fields.symbol);
          if (!ticker) throw new Error("missing ticker");
          empty.analystTargets.push({
            ticker,
            firm: clean(fields.firm),
            rating: clean(fields.rating),
            target: normalizeNumber(fields.target),
            previousTarget: normalizeNumber(fields.previous_target || fields.previousTarget),
            date: normalizeDate(fields.date),
            sourceUrl: clean(fields.source_url || fields.sourceUrl),
          });
          break;
        }
        case "WATCH": {
          const text = clean(fields.text || fields.metric);
          if (!text) throw new Error("missing text");
          empty.watchItems.push({
            text,
            ticker: cleanTicker(fields.ticker),
            themeSlug: cleanTheme(fields.theme),
            timeframe: clean(fields.timeframe),
          });
          break;
        }
        case "VERDICT": {
          const stance = normalizeVerdictStance(fields.stance);
          const rationale = clean(fields.rationale || fields.reason);
          if (!stance) throw new Error("missing stance");
          if (!rationale) throw new Error("missing rationale");
          empty.verdicts.push({
            ticker: cleanTicker(fields.ticker),
            themeSlug: cleanTheme(fields.theme),
            stance,
            priority: normalizeConfidence(fields.priority),
            horizon: clean(fields.horizon),
            rationale,
          });
          break;
        }
        case "DISCOVERY_TICKER": {
          const symbol = cleanTicker(fields.ticker || fields.symbol);
          if (!symbol) throw new Error("missing ticker");
          empty.discoveries.push({
            symbol,
            companyName: clean(fields.company || fields.company_name || fields.name),
            suggestedTheme: cleanTheme(fields.theme),
            reason: clean(fields.reason),
            sourceLine: line,
          });
          break;
        }
        case "QUESTION": {
          const text = clean(fields.text);
          if (!text) throw new Error("missing text");
          empty.questions.push({
            text,
            ticker: cleanTicker(fields.ticker),
            themeSlug: cleanTheme(fields.theme),
          });
          break;
        }
        default:
          empty.ignoredLines.push(line);
      }
    } catch {
      empty.ignoredLines.push(line);
    }
  }

  return empty;
}

function parseFields(segments: string[]): KeyValues {
  const out: KeyValues = {};
  for (const segment of segments) {
    const idx = segment.indexOf("=");
    if (idx <= 0) continue;
    const key = segment.slice(0, idx).trim();
    const value = segment.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function cleanTicker(value?: string) {
  const cleaned = value?.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
  if (!cleaned || cleaned.length > 8) return undefined;
  return cleaned;
}

function cleanTheme(value?: string) {
  const cleaned = value?.trim().toLowerCase().replace(/[^a-z0-9_/-]/g, "_").replace(/-/g, "_");
  return cleaned || undefined;
}

function normalizeConfidence(value?: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function normalizeNumber(value?: string) {
  if (!value) return undefined;
  const n = Number(value.replace(/[$,%]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeLevel(value?: string) {
  const level = value?.trim().toUpperCase();
  return LEVELS.includes(level as (typeof LEVELS)[number])
    ? (level as "LOW" | "MEDIUM" | "HIGH")
    : undefined;
}

function normalizeSentiment(value?: string) {
  const sentiment = value?.trim().toUpperCase();
  return SENTIMENTS.includes(sentiment as (typeof SENTIMENTS)[number])
    ? (sentiment as "BULLISH" | "NEUTRAL" | "BEARISH" | "MIXED")
    : undefined;
}

function normalizeCycle(value?: string) {
  const cycle = value?.trim().toUpperCase();
  return CYCLE_STAGES.includes(cycle as (typeof CYCLE_STAGES)[number])
    ? (cycle as "DORMANT" | "EMERGING" | "HEATING_UP" | "CROWDED" | "ROLLING_OVER")
    : undefined;
}

function normalizeVerdictStance(value?: string) {
  const stance = value?.trim().toUpperCase();
  return VERDICT_STANCES.includes(stance as (typeof VERDICT_STANCES)[number])
    ? (stance as "RESEARCH_NOW" | "WATCH" | "DEFER" | "AVOID")
    : undefined;
}
