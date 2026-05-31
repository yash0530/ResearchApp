import { InsightsCharts } from "@/components/insights-charts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  // Query all active evidence datasets
  const activeFilter = { entry: { deletedAt: null, status: "ACTIVE" as const } };

  const [mentions, themeSignals, risks, targets, verdicts, questions] = await Promise.all([
    prisma.parsedTickerMention.findMany({
      where: activeFilter,
      select: { ticker: true, sentiment: true },
    }),
    prisma.parsedThemeSignal.findMany({
      where: activeFilter,
      select: { themeSlug: true, cycle: true, crowding: true },
    }),
    prisma.parsedRisk.findMany({
      where: activeFilter,
      select: { severity: true },
    }),
    prisma.parsedAnalystTarget.findMany({
      where: { ...activeFilter, target: { not: null } },
      select: { ticker: true, target: true },
    }),
    prisma.parsedVerdict.findMany({
      where: activeFilter,
      include: { entry: true },
      orderBy: { priority: "asc" }, // 1 is usually highest priority
    }),
    prisma.parsedQuestion.findMany({
      where: activeFilter,
      select: { text: true, ticker: true, themeSlug: true },
    }),
  ]);

  // 1. Ticker Mentions Counts
  const tickerMentionCounts = topCounts(mentions.map((m) => m.ticker), 12);

  // 2. Theme Signals Counts
  const themeSignalCounts = topCounts(themeSignals.map((ts) => ts.themeSlug), 12);

  // 3. Risk Severity Counts
  const riskSeverityCounts = topCounts(risks.map((r) => r.severity || "UNKNOWN"), 8);

  // 4. Verdict Stance Mix
  const verdictStanceCounts = topCounts(verdicts.map((v) => v.stance), 6);

  // 5. Theme Cycle-Stage Distribution
  const cycleDistribution = topCounts(
    themeSignals.map((ts) => ts.cycle || "DORMANT"),
    6
  );

  // 6. Sentiment Breakdown per Ticker (Bullish vs Bearish vs Neutral)
  const tickerSentimentMap: Record<string, { bullish: number; neutral: number; bearish: number }> = {};
  for (const m of mentions) {
    if (!tickerSentimentMap[m.ticker]) {
      tickerSentimentMap[m.ticker] = { bullish: 0, neutral: 0, bearish: 0 };
    }
    if (m.sentiment === "BULLISH") tickerSentimentMap[m.ticker].bullish++;
    else if (m.sentiment === "BEARISH") tickerSentimentMap[m.ticker].bearish++;
    else tickerSentimentMap[m.ticker].neutral++;
  }
  const sentimentBreakdown = Object.entries(tickerSentimentMap)
    .map(([ticker, s]) => ({
      name: ticker,
      bullish: s.bullish,
      neutral: s.neutral,
      bearish: s.bearish,
    }))
    .slice(0, 10); // top 10 tickers

  // 7. Analyst Target vs Grounded Price Gap
  // Get latest prices for tickers that have parsed targets
  const uniqueTargetTickers = Array.from(new Set(targets.map((t) => t.ticker)));
  const latestSnapshots = await prisma.tickerMetricSnapshot.findMany({
    where: { symbol: { in: uniqueTargetTickers } },
    orderBy: { asOf: "desc" },
  });

  const latestPrices: Record<string, number> = {};
  for (const snap of latestSnapshots) {
    if (!latestPrices[snap.symbol] && snap.price !== null) {
      latestPrices[snap.symbol] = snap.price;
    }
  }

  // Aggregate analyst targets by ticker symbol
  const tickerTargets: Record<string, { sum: number; count: number }> = {};
  for (const t of targets) {
    if (t.target !== null && t.target !== undefined) {
      if (!tickerTargets[t.ticker]) {
        tickerTargets[t.ticker] = { sum: 0, count: 0 };
      }
      tickerTargets[t.ticker].sum += t.target;
      tickerTargets[t.ticker].count += 1;
    }
  }

  const targetVsPriceGap = Object.entries(tickerTargets)
    .map(([ticker, data]) => {
      const avgTarget = Math.round((data.sum / data.count) * 100) / 100;
      const currentPrice = latestPrices[ticker] ?? null;
      return {
        name: ticker,
        target: avgTarget,
        price: currentPrice,
        gapPct: currentPrice ? Math.round(((avgTarget - currentPrice) / currentPrice) * 100) : 0,
      };
    })
    .sort((a, b) => b.gapPct - a.gapPct)
    .slice(0, 10); // top 10 gaps

  // 8. Ranked Priority Queue (Verdicts sorted by priority)
  const priorityQueue = verdicts
    .map((v) => ({
      id: v.id,
      ticker: v.ticker,
      themeSlug: v.themeSlug,
      stance: v.stance,
      priority: v.priority ?? 99,
      rationale: v.rationale,
      entryId: v.entryId,
      entryTitle: v.entry.title,
    }))
    .sort((a, b) => {
      // RESEARCH_NOW is first priority, then order by priority number
      if (a.stance === "RESEARCH_NOW" && b.stance !== "RESEARCH_NOW") return -1;
      if (a.stance !== "RESEARCH_NOW" && b.stance === "RESEARCH_NOW") return 1;
      return a.priority - b.priority;
    });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Parsed signal</div>
          <h1 className="page-title">Insights</h1>
          <p className="page-subtitle">
            Advanced evidence telemetry and decision analytics compiled from strict LLM parser blocks.
          </p>
        </div>
      </div>

      <InsightsCharts
        tickerMentions={tickerMentionCounts}
        themeSignals={themeSignalCounts}
        riskSeverity={riskSeverityCounts}
        verdictStances={verdictStanceCounts}
        cycleDistribution={cycleDistribution}
        sentimentBreakdown={sentimentBreakdown}
        targetVsPriceGap={targetVsPriceGap}
        priorityQueue={priorityQueue}
        openQuestions={questions.map((q) => ({
          text: q.text,
          ticker: q.ticker,
          themeSlug: q.themeSlug,
        }))}
      />
    </div>
  );
}

function topCounts(values: string[], limit: number) {
  return Object.entries(
    values.reduce<Record<string, number>>((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}
