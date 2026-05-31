import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EntryDetailClient } from "@/components/entry-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResearchDetailPage({ params }: PageProps) {
  const { id } = await params;

  const entry = await prisma.researchEntry.findUnique({
    where: { id },
    include: {
      claims: { orderBy: { createdAt: "asc" } },
      risks: { orderBy: { createdAt: "asc" } },
      catalysts: { orderBy: { createdAt: "asc" } },
      tickerMentions: { orderBy: { createdAt: "asc" } },
      analystTargets: { orderBy: { createdAt: "asc" } },
      themeSignals: { orderBy: { createdAt: "asc" } },
      verdicts: { orderBy: { createdAt: "asc" } },
      questions: { orderBy: { createdAt: "asc" } },
      watchItems: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!entry) {
    notFound();
  }

  // Safely parse the JSON-encoded ignoredLines string array
  let ignoredLines: string[] = [];
  try {
    const parsed = JSON.parse(entry.ignoredLines);
    if (Array.isArray(parsed)) ignoredLines = parsed;
  } catch {
    ignoredLines = [];
  }

  // Format data for the client component
  const formattedEntry = {
    id: entry.id,
    runId: entry.runId,
    title: entry.title,
    sourceApp: entry.sourceApp,
    rawOutput: entry.rawOutput,
    summary: entry.summary,
    notes: entry.notes,
    status: entry.status,
    parseStatus: entry.parseStatus,
    parseError: entry.parseError,
    ignoredLines,
    deletedAt: entry.deletedAt?.toISOString() ?? null,
    updatedAt: formatDate(entry.updatedAt),
    claims: entry.claims.map(c => ({
      id: c.id,
      text: c.text,
      ticker: c.ticker,
      themeSlug: c.themeSlug,
      confidence: c.confidence,
      importance: c.importance,
      sourceUrl: c.sourceUrl
    })),
    risks: entry.risks.map(r => ({
      id: r.id,
      text: r.text,
      ticker: r.ticker,
      themeSlug: r.themeSlug,
      severity: r.severity,
      timeframe: r.timeframe,
      sourceUrl: r.sourceUrl
    })),
    catalysts: entry.catalysts.map(c => ({
      id: c.id,
      text: c.text,
      ticker: c.ticker,
      themeSlug: c.themeSlug,
      importance: c.importance,
      timeframe: c.timeframe,
      sourceUrl: c.sourceUrl
    })),
    tickerMentions: entry.tickerMentions.map(tm => ({
      id: tm.id,
      ticker: tm.ticker,
      themeSlug: tm.themeSlug,
      sentiment: tm.sentiment,
      confidence: tm.confidence,
      role: tm.role
    })),
    analystTargets: entry.analystTargets.map(at => ({
      id: at.id,
      ticker: at.ticker,
      firm: at.firm,
      rating: at.rating,
      target: at.target,
      previousTarget: at.previousTarget,
      date: at.date?.toISOString() ?? null,
      sourceUrl: at.sourceUrl
    })),
    themeSignals: entry.themeSignals.map(ts => ({
      id: ts.id,
      themeSlug: ts.themeSlug,
      cycle: ts.cycle,
      crowding: ts.crowding,
      confidence: ts.confidence,
      summary: ts.summary
    })),
    verdicts: entry.verdicts.map(v => ({
      id: v.id,
      ticker: v.ticker,
      themeSlug: v.themeSlug,
      stance: v.stance,
      priority: v.priority,
      horizon: v.horizon,
      rationale: v.rationale
    })),
    questions: entry.questions.map(q => ({
      id: q.id,
      text: q.text,
      ticker: q.ticker,
      themeSlug: q.themeSlug
    })),
    watchItems: entry.watchItems.map(wi => ({
      id: wi.id,
      text: wi.text,
      ticker: wi.ticker,
      themeSlug: wi.themeSlug,
      timeframe: wi.timeframe
    })),
  };

  return (
    <div>
      <EntryDetailClient entry={formattedEntry} />
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    year: "numeric"
  }).format(date);
}
