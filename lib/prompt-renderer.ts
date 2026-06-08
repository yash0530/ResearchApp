import type { Theme, Ticker, TickerMetricSnapshot, FinancialQuarter } from "@prisma/client";
import { DEFAULT_PORTFOLIO_CONTEXT } from "./portfolio";

export type BuilderValues = {
  sourceApp: string;
  promptTemplateId: string;
  themeSlugs: string[];
  tickers: string[];
  lookback: string;
  financialWindow: string;
  horizon: string;
  researchType: string;
};

export type LocalContextTicker = Ticker & {
  metricSnapshots: TickerMetricSnapshot[];
  financials: FinancialQuarter[];
};

/** Expand a lookback token (e.g. "30d") into a human range with an explicit start date. */
export function lookbackToRange(lookback: string, now: Date = new Date()): string {
  const d = new Date(now);
  switch (lookback) {
    case "24h": d.setDate(d.getDate() - 1); break;
    case "7d": d.setDate(d.getDate() - 7); break;
    case "30d": d.setDate(d.getDate() - 30); break;
    case "90d": d.setDate(d.getDate() - 90); break;
    case "6m": d.setMonth(d.getMonth() - 6); break;
    case "ytd": return `${lookback} (since ${now.getFullYear()}-01-01)`;
    default: return lookback;
  }
  return `${lookback} (since ${d.toISOString().slice(0, 10)})`;
}

/** Per-source-app instruction appended at render time. Must NOT contain triple backticks. */
export function sourceAppAddendum(sourceApp: string): string {
  switch (sourceApp) {
    case "PERPLEXITY":
      return "\n\nSource-app note (Perplexity): use your live web search. Include a source URL for every dated claim and every analyst target.";
    case "CLAUDE":
    case "CHATGPT":
    case "GEMINI":
      return "\n\nSource-app note: if you cannot verify a figure, mark it UNVERIFIED rather than guessing. End your answer with exactly one fenced json block and no text after it.";
    default:
      return "";
  }
}

export function renderPrompt({
  body,
  themes,
  values,
  localContext,
  today = new Date(),
  portfolioContext = DEFAULT_PORTFOLIO_CONTEXT,
}: {
  body: string;
  themes: Theme[];
  values: BuilderValues;
  localContext: string;
  today?: Date;
  portfolioContext?: string;
}) {
  const themeText = themes.length
    ? themes.map((theme) => `${theme.slug} (${theme.name})`).join(", ")
    : "No themes selected";
  const tickerText = values.tickers.length ? values.tickers.join(", ") : "No tickers selected";
  const todayIso = today.toISOString().slice(0, 10);

  const rendered = body
    .replaceAll("{{themes}}", themeText)
    .replaceAll("{{tickers}}", tickerText)
    .replaceAll("{{lookback}}", lookbackToRange(values.lookback, today))
    .replaceAll("{{financial_window}}", values.financialWindow)
    .replaceAll("{{horizon}}", values.horizon)
    .replaceAll("{{local_context}}", localContext || "LOCAL_CONTEXT_UNAVAILABLE")
    .replaceAll("{{today}}", todayIso)
    .replaceAll("{{portfolio_context}}", portfolioContext)
    .replaceAll("{{research_type}}", values.researchType);

  return rendered + sourceAppAddendum(values.sourceApp);
}

export function buildLocalContext(tickers: LocalContextTicker[]) {
  if (!tickers.length) return "LOCAL_CONTEXT_EMPTY";
  const lines: string[] = [
    "# LOCAL_TICKER lines are cached Signal Desk data. as_of = date the value was cached; source = finance terminal or yahoo fallback. Treat values older than ~1 day as potentially stale.",
  ];

  for (const ticker of tickers) {
    const latest = ticker.metricSnapshots[0];
    if (latest) {
      let spotlightTags: string[] = [];
      try {
        const parsed = JSON.parse((latest as Record<string, unknown>).spotlightTags as string ?? "[]");
        if (Array.isArray(parsed)) {
          spotlightTags = parsed.map((t: unknown) => String(t).replace(/[|\n\r]/g, " ").trim()).filter(Boolean);
        }
      } catch {
        // ignore malformed JSON
      }

      const forwardPeSectorAvg = (latest as Record<string, unknown>).forwardPeSectorAvg as number | null | undefined;
      const forwardPe = latest.forwardPe;
      const forwardPeVsSectorAvg =
        forwardPe != null && forwardPeSectorAvg != null && forwardPeSectorAvg !== 0
          ? Math.round((forwardPe / forwardPeSectorAvg) * 10000) / 10000
          : null;
      const asOf = latest.asOf ? new Date(latest.asOf).toISOString().slice(0, 10) : "na";
      const source = ((latest as Record<string, unknown>).dataSource as string) ?? "yahoo";

      lines.push(
        [
          "LOCAL_TICKER",
          `ticker=${ticker.symbol}`,
          `price=${formatMaybe(latest.price)}`,
          `market_cap=${formatMaybe(latest.marketCap)}`,
          `ytd_return_pct=${formatMaybe(latest.ytdReturnPct)}`,
          `one_month_return_pct=${formatMaybe(latest.oneMonthReturnPct)}`,
          `three_month_return_pct=${formatMaybe(latest.threeMonthReturnPct)}`,
          `six_month_return_pct=${formatMaybe(latest.sixMonthReturnPct)}`,
          `one_year_return_pct=${formatMaybe(latest.oneYearReturnPct)}`,
          `forward_pe=${formatMaybe(latest.forwardPe)}`,
          `trailing_pe=${formatMaybe(latest.trailingPe)}`,
          `analyst_mean_target=${formatMaybe(latest.analystMeanTarget)}`,
          `sector=${sanitizeText((latest as Record<string, unknown>).sector as string | null | undefined) ?? "na"}`,
          `beta=${formatMaybe((latest as Record<string, unknown>).beta as number | null | undefined)}`,
          `sector_momentum_pct=${formatMaybe((latest as Record<string, unknown>).sectorMomentumPercentile as number | null | undefined)}`,
          `forward_pe_vs_sector_avg=${forwardPeVsSectorAvg !== null ? forwardPeVsSectorAvg : "na"}`,
          `spotlight=${spotlightTags.length > 0 ? spotlightTags.join(",") : "na"}`,
          `as_of=${asOf}`,
          `source=${source}`,
        ].join("|"),
      );
    } else {
      lines.push(`LOCAL_TICKER|ticker=${ticker.symbol}|data=unavailable`);
    }

    for (const q of ticker.financials.slice(0, 8)) {
      lines.push(
        [
          "LOCAL_QUARTER",
          `ticker=${ticker.symbol}`,
          `quarter=${q.quarter}`,
          `revenue=${formatMaybe(q.revenue)}`,
          `gross_margin=${formatMaybe(q.grossMargin)}`,
          `fcf=${formatMaybe(q.fcf)}`,
          `net_income=${formatMaybe(q.netIncome)}`,
        ].join("|"),
      );
    }
  }

  return lines.join("\n");
}

function formatMaybe(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "na";
  return Number(value.toFixed(4)).toString();
}

function sanitizeText(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;                                                                             
  const clean = value.replace(/[|\n\r]/g, " ").trim();
  return clean || null;
}
