import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TickersIndexPage() {
  const tickers = await prisma.ticker.findMany({
    where: { isActive: true },
    orderBy: { symbol: "asc" },
    include: {
      metricSnapshots: {
        orderBy: { asOf: "desc" },
        take: 1,
      },
      themeLinks: {
        include: { theme: true },
      },
    },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Market universe</div>
          <h1 className="page-title">Tickers</h1>
          <p className="page-subtitle">
            All active tracked tickers with latest grounded metrics. Click a symbol for the full signal breakdown.
          </p>
        </div>
      </div>

      {tickers.length === 0 ? (
        <div className="panel panel-pad text-center py-16">
          <p className="text-[var(--muted)] text-sm">No active tickers yet.</p>
          <p className="text-[var(--muted)] text-xs mt-1">
            Add tickers via the Themes &amp; Tickers page or the Discoveries queue.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)] uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Sector</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-right">YTD</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Themes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {tickers.map((ticker) => {
                  const snap = ticker.metricSnapshots[0] ?? null;
                  const rawSnap = snap as any;
                  const sector: string | null = rawSnap?.sector ?? null;
                  const price: number | null = snap?.price ?? null;
                  const ytd: number | null = snap?.ytdReturnPct ?? null;
                  const dataSource: string = rawSnap?.dataSource ?? "yahoo";

                  return (
                    <tr
                      key={ticker.id}
                      className="hover:bg-[var(--soft)] transition-colors"
                    >
                      {/* Symbol */}
                      <td className="px-4 py-3 font-mono font-semibold">
                        <Link
                          href={`/tickers/${ticker.symbol}`}
                          className="text-[var(--text)] hover:underline"
                        >
                          {ticker.symbol}
                        </Link>
                      </td>

                      {/* Company name */}
                      <td className="px-4 py-3 text-[var(--muted)] max-w-[200px] truncate">
                        {ticker.companyName ?? <span className="text-[var(--muted)] opacity-50">—</span>}
                      </td>

                      {/* Sector */}
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {sector ?? <span className="opacity-50">—</span>}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right font-mono">
                        {price != null ? (
                          <span>${price.toFixed(2)}</span>
                        ) : (
                          <span className="text-[var(--muted)] opacity-50">—</span>
                        )}
                      </td>

                      {/* YTD return */}
                      <td className="px-4 py-3 text-right font-mono">
                        {ytd != null ? (
                          <span
                            style={{
                              color: ytd >= 0 ? "var(--good)" : "var(--bad)",
                            }}
                          >
                            {ytd >= 0 ? "+" : ""}
                            {ytd.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-[var(--muted)] opacity-50">—</span>
                        )}
                      </td>

                      {/* Data source badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`badge text-[10px] uppercase tracking-wide ${
                            dataSource === "finance"
                              ? "bg-[color-mix(in_srgb,var(--good)_15%,transparent)] text-[var(--good)]"
                              : "bg-[var(--soft)] text-[var(--muted)]"
                          }`}
                        >
                          {dataSource}
                        </span>
                      </td>

                      {/* Theme chips */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ticker.themeLinks.length === 0 ? (
                            <span className="text-[var(--muted)] opacity-50 text-xs">—</span>
                          ) : (
                            ticker.themeLinks.map((link) => (
                              <Link
                                key={link.themeId}
                                href={`/themes`}
                                className="badge text-[10px] truncate max-w-[100px]"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${link.theme.color} 15%, transparent)`,
                                  color: link.theme.color,
                                  borderColor: `color-mix(in srgb, ${link.theme.color} 30%, transparent)`,
                                }}
                                title={link.theme.name}
                              >
                                {link.theme.name}
                              </Link>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
            {tickers.length} active ticker{tickers.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
