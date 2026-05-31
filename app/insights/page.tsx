import { InsightsCharts } from "@/components/insights-charts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [mentions, themes, risks, targets] = await Promise.all([
    prisma.parsedTickerMention.findMany({
      where: { entry: { deletedAt: null, status: "ACTIVE" } },
      select: { ticker: true },
    }),
    prisma.parsedThemeSignal.findMany({
      where: { entry: { deletedAt: null, status: "ACTIVE" } },
      select: { themeSlug: true },
    }),
    prisma.parsedRisk.findMany({
      where: { entry: { deletedAt: null, status: "ACTIVE" } },
      select: { severity: true },
    }),
    prisma.parsedAnalystTarget.findMany({
      where: { entry: { deletedAt: null, status: "ACTIVE", }, target: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { ticker: true, target: true, createdAt: true },
    }),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Parsed signal</div>
          <h1 className="page-title">Insights</h1>
          <p className="page-subtitle">
            Basic visualizations from the strict parse blocks. Bad, stale, archived, and deleted research is excluded.
          </p>
        </div>
      </div>
      <InsightsCharts
        tickerMentions={topCounts(mentions.map((item) => item.ticker), 12)}
        themeSignals={topCounts(themes.map((item) => item.themeSlug), 12)}
        riskSeverity={topCounts(risks.map((item) => item.severity || "UNKNOWN"), 8)}
        targetHistory={targets.map((target) => ({
          date: `${target.ticker} ${target.createdAt.toLocaleDateString("en", { month: "short", day: "numeric" })}`,
          target: target.target,
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
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}
