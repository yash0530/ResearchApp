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

function clean(value?: any) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

export function cleanTicker(value?: any) {
  let str: string | undefined;
  if (typeof value === "string") {
    str = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    str = String(value);
  }
  const cleaned = str?.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
  if (!cleaned || cleaned.length > 8) return undefined;
  return cleaned;
}

function cleanTheme(value?: any) {
  let str: string | undefined;
  if (typeof value === "string") {
    str = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    str = String(value);
  }
  const cleaned = str?.trim().toLowerCase().replace(/[^a-z0-9_/-]/g, "_").replace(/-/g, "_");
  return cleaned || undefined;
}

function normalizeConfidence(value?: any) {
  if (value === null || value === undefined || typeof value === "boolean" || Array.isArray(value)) {
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function normalizeNumber(value?: any) {
  if (value === undefined || value === null || typeof value === "boolean" || Array.isArray(value)) return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  const str = String(value).trim();
  if (!str) return undefined;
  const n = Number(str.replace(/[$,%]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDate(value?: any) {
  if (!value || typeof value === "boolean" || Array.isArray(value)) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === "object") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeLevel(value?: any) {
  if (typeof value !== "string") return undefined;
  const level = value.trim().toUpperCase();
  return LEVELS.includes(level as (typeof LEVELS)[number])
    ? (level as "LOW" | "MEDIUM" | "HIGH")
    : undefined;
}

function normalizeSentiment(value?: any) {
  if (typeof value !== "string") return undefined;
  const sentiment = value.trim().toUpperCase();
  return SENTIMENTS.includes(sentiment as (typeof SENTIMENTS)[number])
    ? (sentiment as "BULLISH" | "NEUTRAL" | "BEARISH" | "MIXED")
    : undefined;
}

function normalizeCycle(value?: any) {
  if (typeof value !== "string") return undefined;
  const cycle = value.trim().toUpperCase();
  return CYCLE_STAGES.includes(cycle as (typeof CYCLE_STAGES)[number])
    ? (cycle as "DORMANT" | "EMERGING" | "HEATING_UP" | "CROWDED" | "ROLLING_OVER")
    : undefined;
}

function normalizeVerdictStance(value?: any) {
  if (typeof value !== "string") return undefined;
  const stance = value.trim().toUpperCase();
  return VERDICT_STANCES.includes(stance as (typeof VERDICT_STANCES)[number])
    ? (stance as "RESEARCH_NOW" | "WATCH" | "DEFER" | "AVOID")
    : undefined;
}

// ── JSON-block parsing (new primary format) ──────────────────────────────────

const JSON_FENCE_RE = /```(?:json|signal)?\s*([\s\S]*?)```/gi;

/** Extract the LAST fenced code block that parses as a JSON object. Returns null if none. */
function extractJsonBlock(raw: string): any | null {
  let match: RegExpExecArray | null;
  let last: string | null = null;
  JSON_FENCE_RE.lastIndex = 0; // Reset index for multiple calls
  while ((match = JSON_FENCE_RE.exec(raw)) !== null) {
    const body = match[1].trim();
    if (body.startsWith("{")) last = body;
  }
  if (!last) {
    // No fence: try a bare top-level object spanning the first "{" to the last "}".
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s >= 0 && e > s) last = raw.slice(s, e + 1);
  }
  if (!last) return null;
  try {
    return JSON.parse(last);
  } catch {
    return { __parseError: true };
  }
}

const asArray = (v: unknown): any[] => (Array.isArray(v) ? v : []);

/**
 * Parse the AI's JSON object into a ParsedSignalBlock. Returns null ONLY when no
 * JSON block is present at all (so the caller can fall back to the legacy parser).
 */
export function parseSignalJson(rawOutput: string): ParsedSignalBlock | null {
  const obj = extractJsonBlock(rawOutput);
  if (obj === null) return null;

  const block: ParsedSignalBlock = {
    claims: [], risks: [], catalysts: [], tickerMentions: [], analystTargets: [],
    themeSignals: [], watchItems: [], verdicts: [], discoveries: [], questions: [],
    lineCount: 0, ignoredLines: [],
  };
  if (obj.__parseError) {
    block.ignoredLines.push("Found a ```json block but it failed to parse as JSON.");
    return block;
  }

  const push = (raw: any, ok: boolean, target: any[], item: any) => {
    block.lineCount += 1;
    if (ok) target.push(item);
    else block.ignoredLines.push(JSON.stringify(raw));
  };

  for (const t of asArray(obj.themes ?? obj.themeSignals)) {
    const themeSlug = cleanTheme(t.theme ?? t.themeSlug);
    push(t, !!themeSlug, block.themeSignals, {
      themeSlug, cycle: normalizeCycle(t.cycle), crowding: normalizeLevel(t.crowding),
      confidence: normalizeConfidence(t.confidence), summary: clean(t.summary),
    });
  }
  for (const t of asArray(obj.tickers ?? obj.tickerMentions)) {
    const ticker = cleanTicker(t.ticker ?? t.symbol);
    push(t, !!ticker, block.tickerMentions, {
      ticker, themeSlug: cleanTheme(t.theme), sentiment: normalizeSentiment(t.sentiment),
      confidence: normalizeConfidence(t.confidence), role: clean(t.role),
    });
  }
  for (const c of asArray(obj.claims)) {
    const text = clean(c.text);
    push(c, !!text, block.claims, {
      text, ticker: cleanTicker(c.ticker), themeSlug: cleanTheme(c.theme),
      confidence: normalizeConfidence(c.confidence), importance: normalizeLevel(c.importance),
      sourceUrl: clean(c.source_url ?? c.sourceUrl),
    });
  }
  for (const r of asArray(obj.risks)) {
    const text = clean(r.text);
    push(r, !!text, block.risks, {
      text, ticker: cleanTicker(r.ticker), themeSlug: cleanTheme(r.theme),
      severity: normalizeLevel(r.severity), timeframe: clean(r.timeframe),
      sourceUrl: clean(r.source_url ?? r.sourceUrl),
    });
  }
  for (const c of asArray(obj.catalysts)) {
    const text = clean(c.text);
    push(c, !!text, block.catalysts, {
      text, ticker: cleanTicker(c.ticker), themeSlug: cleanTheme(c.theme),
      importance: normalizeLevel(c.importance), timeframe: clean(c.timeframe),
      sourceUrl: clean(c.source_url ?? c.sourceUrl),
    });
  }
  for (const t of asArray(obj.targets ?? obj.analystTargets)) {
    const ticker = cleanTicker(t.ticker ?? t.symbol);
    push(t, !!ticker, block.analystTargets, {
      ticker, firm: clean(t.firm), rating: clean(t.rating), target: normalizeNumber(t.target),
      previousTarget: normalizeNumber(t.previous_target ?? t.previousTarget),
      date: normalizeDate(t.date), sourceUrl: clean(t.source_url ?? t.sourceUrl),
    });
  }
  for (const w of asArray(obj.watch ?? obj.watchItems)) {
    const text = clean(w.text ?? w.metric);
    push(w, !!text, block.watchItems, {
      text, ticker: cleanTicker(w.ticker), themeSlug: cleanTheme(w.theme), timeframe: clean(w.timeframe),
    });
  }
  for (const v of asArray(obj.verdicts)) {
    const stance = normalizeVerdictStance(v.stance);
    const rationale = clean(v.rationale ?? v.reason);
    push(v, !!stance && !!rationale, block.verdicts, {
      ticker: cleanTicker(v.ticker), themeSlug: cleanTheme(v.theme), stance: stance!,
      priority: normalizeConfidence(v.priority), horizon: clean(v.horizon), rationale: rationale!,
    });
  }
  for (const d of asArray(obj.discoveries)) {
    const symbol = cleanTicker(d.ticker ?? d.symbol);
    push(d, !!symbol, block.discoveries, {
      symbol: symbol!, companyName: clean(d.company ?? d.company_name ?? d.name),
      suggestedTheme: cleanTheme(d.theme), reason: clean(d.reason),
      sourceLine: `DISCOVERY ${symbol} (json)`,
    });
  }
  for (const q of asArray(obj.questions)) {
    const text = clean(q.text);
    push(q, !!text, block.questions, {
      text, ticker: cleanTicker(q.ticker), themeSlug: cleanTheme(q.theme),
    });
  }
  return block;
}

/**
 * Top-level entry point. Try the JSON block first; if there is NO json block at all,
 * fall back to the legacy SIGNAL_DESK pipe parser (for old saved entries).
 */
export function parseResearchOutput(rawOutput: string): ParsedSignalBlock {
  const json = parseSignalJson(rawOutput);
  if (json) return json;
  return parseSignalDeskBlock(rawOutput);
}
