import type { Theme, Ticker, TickerMetricSnapshot, FinancialQuarter } from "@prisma/client";

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

export function renderPrompt({
  body,
  themes,
  values,
  localContext,
}: {
  body: string;
  themes: Theme[];
  values: BuilderValues;
  localContext: string;
}) {
  const themeText = themes.length
    ? themes.map((theme) => `${theme.slug} (${theme.name})`).join(", ")
    : "No themes selected";
  const tickerText = values.tickers.length ? values.tickers.join(", ") : "No tickers selected";

  return body
    .replaceAll("{{themes}}", themeText)
    .replaceAll("{{tickers}}", tickerText)
    .replaceAll("{{lookback}}", values.lookback)
    .replaceAll("{{financial_window}}", values.financialWindow)
    .replaceAll("{{horizon}}", values.horizon)
    .replaceAll("{{local_context}}", localContext || "LOCAL_CONTEXT_UNAVAILABLE")
    .replaceAll("{{research_type}}", values.researchType);
}

export function buildLocalContext(tickers: LocalContextTicker[]) {
  if (!tickers.length) return "LOCAL_CONTEXT_EMPTY";
  const lines: string[] = [];

  for (const ticker of tickers) {
    const latest = ticker.metricSnapshots[0];
    if (latest) {
      // Parse spotlightTags — stored as a JSON string array.
      let spotlightTags: string[] = [];
      try {
        const parsed = JSON.parse((latest as Record<string, unknown>).spotlightTags as string ?? "[]");
        if (Array.isArray(parsed)) {
          // Sanitize: strip any pipe or newline characters that would break the format.
          spotlightTags = parsed.map((t: unknown) =>
            String(t).replace(/[|\n\r]/g, " ").trim(),
          ).filter(Boolean);
        }
      } catch {
        // ignore malformed JSON
      }

      // forward_pe_vs_sector_avg: ratio of ticker forwardPe to sector average.
      const forwardPeSectorAvg = (latest as Record<string, unknown>).forwardPeSectorAvg as number | null | undefined;
      const forwardPe = latest.forwardPe;
      const forwardPeVsSectorAvg =
        forwardPe !== null &&
        forwardPe !== undefined &&
        forwardPeSectorAvg !== null &&
        forwardPeSectorAvg !== undefined &&
        forwardPeSectorAvg !== 0
          ? Math.round((forwardPe / forwardPeSectorAvg) * 10000) / 10000
          : null;

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
          // Finance-grounded fields (emit as "na" when absent).
          `sector=${sanitizeText((latest as Record<string, unknown>).sector as string | null | undefined) ?? "na"}`,
          `beta=${formatMaybe((latest as Record<string, unknown>).beta as number | null | undefined)}`,
          `sector_momentum_pct=${formatMaybe((latest as Record<string, unknown>).sectorMomentumPercentile as number | null | undefined)}`,
          `forward_pe_vs_sector_avg=${forwardPeVsSectorAvg !== null ? forwardPeVsSectorAvg : "na"}`,
          `spotlight=${spotlightTags.length > 0 ? spotlightTags.join(",") : "na"}`,
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

/** Strip pipe and newline characters from a string field so it is safe to embed in a pipe-delimited line. */
function sanitizeText(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const clean = value.replace(/[|\n\r]/g, " ").trim();
  return clean || null;
}
