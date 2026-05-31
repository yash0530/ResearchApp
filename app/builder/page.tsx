import { BuilderClient } from "@/components/builder-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const [prompts, themes, tickers] = await Promise.all([
    prisma.promptTemplate.findMany({
      orderBy: [{ isFavorite: "desc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        cadence: true,
        isFavorite: true,
      },
    }),
    prisma.theme.findMany({
      orderBy: { name: "asc" },
      include: { tickerLinks: { include: { ticker: true } } },
    }),
    prisma.ticker.findMany({
      where: { isActive: true },
      orderBy: { symbol: "asc" },
      include: { themeLinks: { include: { theme: true } } },
    }),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Prompt cockpit</div>
          <h1 className="page-title">Builder</h1>
          <p className="page-subtitle">
            Select categories and tickers, render a strict research prompt, copy it, and open your external research tool.
          </p>
        </div>
      </div>
      <BuilderClient
        prompts={prompts}
        themes={themes.map((theme) => ({
          slug: theme.slug,
          name: theme.name,
          color: theme.color,
          tickers: theme.tickerLinks.map((link) => link.ticker.symbol).sort(),
        }))}
        tickers={tickers.map((ticker) => ({
          symbol: ticker.symbol,
          companyName: ticker.companyName,
          dataStatus: ticker.dataStatus,
          themeSlugs: ticker.themeLinks.map((link) => link.theme.slug),
        }))}
      />
    </div>
  );
}
