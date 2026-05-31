import { ThemesClient } from "@/components/themes-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const themes = await prisma.theme.findMany({
    orderBy: { name: "asc" },
    include: {
      tickerLinks: {
        include: { ticker: true },
        orderBy: { ticker: { symbol: "asc" } },
      },
    },
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
      <ThemesClient
        themes={themes.map((theme) => ({
          slug: theme.slug,
          name: theme.name,
          description: theme.description,
          color: theme.color,
          tickers: theme.tickerLinks.map((link) => ({
            symbol: link.ticker.symbol,
            role: link.role,
            dataStatus: link.ticker.dataStatus,
          })),
        }))}
      />
    </div>
  );
}
