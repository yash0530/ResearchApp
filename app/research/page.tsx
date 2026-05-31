import { ResearchClient } from "@/components/research-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const entries = await prisma.researchEntry.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      _count: {
        select: {
          claims: true,
          risks: true,
          catalysts: true,
          analystTargets: true,
          tickerMentions: true,
        },
      },
    },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Evidence ledger</div>
          <h1 className="page-title">Research</h1>
          <p className="page-subtitle">
            Review saved outputs, mark bad work stale or incorrect, and keep weak research out of default dashboards.
          </p>
        </div>
      </div>
      <ResearchClient
        entries={entries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          sourceApp: entry.sourceApp,
          status: entry.status,
          parseStatus: entry.parseStatus,
          deletedAt: entry.deletedAt?.toISOString() ?? null,
          updatedAt: formatDate(entry.updatedAt),
          summary: entry.summary,
          rawPreview: entry.rawOutput.slice(0, 360),
          counts: {
            claims: entry._count.claims,
            risks: entry._count.risks,
            catalysts: entry._count.catalysts,
            targets: entry._count.analystTargets,
            tickers: entry._count.tickerMentions,
          },
        }))}
      />
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
