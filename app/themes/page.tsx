import { ThemesClient } from "@/components/themes-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const [themes, activeSignals, activeVerdicts] = await Promise.all([
    prisma.theme.findMany({
      orderBy: { name: "asc" },
      include: {
        tickerLinks: {
          include: { ticker: true },
          orderBy: { ticker: { symbol: "asc" } },
        },
      },
    }),
    prisma.parsedThemeSignal.findMany({
      where: {
        entry: {
          deletedAt: null,
          status: "ACTIVE",
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parsedVerdict.findMany({
      where: {
        entry: {
          deletedAt: null,
          status: "ACTIVE",
        },
      },
      include: { entry: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Map theme enrichment
  const enrichedThemes = themes.map((theme) => {
    // Find latest signal for this theme
    const themeSignals = activeSignals.filter((s) => s.themeSlug === theme.slug);
    const latestSignal = themeSignals[0] ?? null;

    const cycleStage = latestSignal?.cycle ?? null;
    const crowding = latestSignal?.crowding ?? null;

    // Filter verdicts for this theme slug OR related tickers
    const themeTickers = new Set(theme.tickerLinks.map((link) => link.ticker.symbol));
    const relatedVerdicts = activeVerdicts.filter(
      (v) => v.themeSlug === theme.slug || (v.ticker && themeTickers.has(v.ticker))
    );

    return {
      slug: theme.slug,
      name: theme.name,
      description: theme.description,
      color: theme.color,
      cycleStage,
      crowding,
      tickers: theme.tickerLinks.map((link) => ({
        symbol: link.ticker.symbol,
        role: link.role,
        dataStatus: link.ticker.dataStatus,
      })),
      verdicts: relatedVerdicts.map((v) => ({
        id: v.id,
        ticker: v.ticker,
        stance: v.stance,
        priority: v.priority,
        rationale: v.rationale,
        entryId: v.entryId,
        entryTitle: v.entry.title,
      })),
    };
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Universe control</div>
          <h1 className="page-title">Themes & Tickers</h1>
          <p className="page-subtitle">
            Signal Desk starts with a curated AI-infrastructure map, but the taxonomy is editable as the market evolves.
          </p>
        </div>
      </div>
      <ThemesClient themes={enrichedThemes} />
    </div>
  );
}
