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
