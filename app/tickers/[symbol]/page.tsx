import { notFound } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { TickerClient } from "@/components/ticker-client";
import { ensureMarketData, validateSymbol } from "@/lib/market";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function TickerDetailPage({ params }: PageProps) {
  const { symbol } = await params;
  const uppercaseSymbol = symbol.toUpperCase().trim();

  // Find ticker metadata or auto-create for valid US stocks
  let tickerRow = await prisma.ticker.findUnique({
    where: { symbol: uppercaseSymbol },
  });

  if (!tickerRow) {
    const v = await validateSymbol(uppercaseSymbol);
    if (v.dataStatus === "UNVERIFIED" && !v.companyName) {
      notFound();
    }
    tickerRow = await prisma.ticker.create({
      data: {
        symbol: uppercaseSymbol,
        companyName: v.companyName ?? null,
        dataStatus: v.dataStatus,
      },
    });
  }

  // Get the latest metric snapshot
  let snapshotRow = await prisma.tickerMetricSnapshot.findFirst({
    where: { symbol: uppercaseSymbol },
    orderBy: { asOf: "desc" },
  });

  const SNAPSHOT_TTL_MS = 6 * 60 * 60 * 1000;
  const isColdOrStale = !snapshotRow || (Date.now() - snapshotRow.asOf.getTime() > SNAPSHOT_TTL_MS);

  if (isColdOrStale) {
    if (!snapshotRow) {
      // Cold first visit: do a synchronous populate so the page isn't empty
      try {
        await ensureMarketData([uppercaseSymbol]);
        // Re-query the snapshot after creation
        snapshotRow = await prisma.tickerMetricSnapshot.findFirst({
          where: { symbol: uppercaseSymbol },
          orderBy: { asOf: "desc" },
        });
      } catch {
        /* offline -> gracefully ignore */
      }
    } else {
      // Subsequent stale load: refresh in the background using after()
      after(async () => {
        try {
          await ensureMarketData([uppercaseSymbol]);
        } catch (e) {
          console.error("Background refresh failed:", e);
        }
      });
    }
  }

  // Extract directly as the schema is fully migrated and typed
  let snapshotFormatted = null;
  if (snapshotRow) {
    let spotlightTags: string[] = [];
    if (snapshotRow.spotlightTags) {
      try {
        spotlightTags = typeof snapshotRow.spotlightTags === "string" ? JSON.parse(snapshotRow.spotlightTags) : snapshotRow.spotlightTags;
      } catch {
        spotlightTags = [];
      }
    }

    snapshotFormatted = {
      price: snapshotRow.price,
      marketCap: snapshotRow.marketCap,
      week52High: snapshotRow.week52High,
      week52Low: snapshotRow.week52Low,
      forwardPe: snapshotRow.forwardPe,
      trailingPe: snapshotRow.trailingPe,
      analystMeanTarget: snapshotRow.analystMeanTarget,
      ytdReturnPct: snapshotRow.ytdReturnPct,
      oneMonthReturnPct: snapshotRow.oneMonthReturnPct,
      threeMonthReturnPct: snapshotRow.threeMonthReturnPct,
      sixMonthReturnPct: snapshotRow.sixMonthReturnPct,
      oneYearReturnPct: snapshotRow.oneYearReturnPct,
      asOf: snapshotRow.asOf.toISOString(),
      sector: snapshotRow.sector ?? null,
      beta: snapshotRow.beta ?? null,
      sectorMomentumPercentile: snapshotRow.sectorMomentumPercentile ?? null,
      forwardPeSectorAvg: snapshotRow.forwardPeSectorAvg ?? null,
      spotlightTags,
      dataSource: snapshotRow.dataSource ?? "yahoo",
    };
  }

  // Fetch active evidence items (where entry has deletedAt: null and status: "ACTIVE")
  const activeFilter = {
    entry: {
      deletedAt: null,
      status: "ACTIVE" as const,
    },
  };

  const [verdicts, risks, catalysts, targets, mentions, questions] = await Promise.all([
    prisma.parsedVerdict.findMany({
      where: { ticker: uppercaseSymbol, ...activeFilter },
      include: { entry: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parsedRisk.findMany({
      where: { ticker: uppercaseSymbol, ...activeFilter },
      include: { entry: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parsedCatalyst.findMany({
      where: { ticker: uppercaseSymbol, ...activeFilter },
      include: { entry: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parsedAnalystTarget.findMany({
      where: { ticker: uppercaseSymbol, ...activeFilter },
      include: { entry: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parsedTickerMention.findMany({
      where: { ticker: uppercaseSymbol, ...activeFilter },
      include: { entry: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parsedQuestion.findMany({
      where: { ticker: uppercaseSymbol, ...activeFilter },
      include: { entry: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Try fetching live news & catalysts from the sibling finance app (localhost:5001)
  let liveNews: any[] | null = null;
  let liveCatalysts: any[] | null = null;

  try {
    const newsRes = await fetch(
      `http://localhost:5001/api/terminal/news?theme=${uppercaseSymbol}&limit=15`,
      { signal: AbortSignal.timeout(1000) }
    );
    if (newsRes.ok) {
      const newsData = await newsRes.json();
      const rawNewsList = newsData.items || newsData.news || newsData.data?.items || newsData.data || [];
      liveNews = Array.isArray(rawNewsList)
        ? rawNewsList.map((item: any) => ({
            headline: item.headline || item.title || "Headline",
            source: item.source || item.provider || "Tape",
            summary: item.summary || item.body || "",
            url: item.url || undefined,
            time: item.time || item.date || item.published || "Recently",
          }))
        : [];
    }
  } catch (e) {
    // Graceful offline fallback
    liveNews = null;
  }

  try {
    const catRes = await fetch(
      `http://localhost:5001/api/catalysts?tickers=${uppercaseSymbol}&days_ahead=90`,
      { signal: AbortSignal.timeout(1000) }
    );
    if (catRes.ok) {
      const catData = await catRes.json();
      const rawCatalystsList = catData.catalysts || catData.items || catData.data || [];
      liveCatalysts = Array.isArray(rawCatalystsList)
        ? rawCatalystsList.map((item: any) => ({
            event_type: item.event_type || item.type || "Catalyst",
            event_date: item.event_date || item.date || "Upcoming",
            description: item.description || item.text || "",
            source: item.source || "Grounded analysis",
          }))
        : [];
    }
  } catch (e) {
    // Graceful offline fallback
    liveCatalysts = null;
  }

  // Format active lists for TickerClient
  const formattedVerdicts = verdicts.map((v) => ({
    id: v.id,
    entryId: v.entryId,
    entryTitle: v.entry.title,
    stance: v.stance,
    priority: v.priority,
    horizon: v.horizon,
    rationale: v.rationale,
    createdAt: formatDate(v.createdAt),
  }));

  const formattedRisks = risks.map((r) => ({
    id: r.id,
    entryId: r.entryId,
    entryTitle: r.entry.title,
    text: r.text,
    severity: r.severity,
    timeframe: r.timeframe,
    sourceUrl: r.sourceUrl,
  }));

  const formattedCatalysts = catalysts.map((c) => ({
    id: c.id,
    entryId: c.entryId,
    entryTitle: c.entry.title,
    text: c.text,
    importance: c.importance,
    timeframe: c.timeframe,
    sourceUrl: c.sourceUrl,
  }));

  const formattedTargets = targets.map((t) => ({
    id: t.id,
    entryId: t.entryId,
    entryTitle: t.entry.title,
    firm: t.firm,
    rating: t.rating,
    target: t.target,
    previousTarget: t.previousTarget,
    date: t.date ? t.date.toISOString() : null,
  }));

  const formattedMentions = mentions.map((m) => ({
    id: m.id,
    entryId: m.entryId,
    entryTitle: m.entry.title,
    sentiment: m.sentiment,
    confidence: m.confidence,
    role: m.role,
  }));

  const formattedQuestions = questions.map((q) => ({
    id: q.id,
    entryId: q.entryId,
    entryTitle: q.entry.title,
    text: q.text,
  }));

  return (
    <TickerClient
      symbol={uppercaseSymbol}
      companyName={tickerRow.companyName}
      notes={tickerRow.notes}
      dataStatus={tickerRow.dataStatus}
      snapshot={snapshotFormatted}
      verdicts={formattedVerdicts}
      risks={formattedRisks}
      catalysts={formattedCatalysts}
      targets={formattedTargets}
      mentions={formattedMentions}
      questions={formattedQuestions}
      liveNews={liveNews}
      liveCatalysts={liveCatalysts}
    />
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
