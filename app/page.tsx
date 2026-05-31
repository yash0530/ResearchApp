import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpenText,
  Compass,
  Library,
  Search,
  Tags,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { prettifyEnum } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function Home() {
  const activeFilter = { deletedAt: null, status: "ACTIVE" as const };

  const [
    promptCount,
    favoriteCount,
    activeResearchCount,
    themeCount,
    newDiscoveries,
    recentRuns,
    latestResearch,
    mentions,
    researchNowVerdicts,
  ] = await Promise.all([
    prisma.promptTemplate.count(),
    prisma.promptTemplate.count({ where: { isFavorite: true } }),
    prisma.researchEntry.count({ where: activeFilter }),
    prisma.theme.count(),
    prisma.discoveryCandidate.count({ where: { status: "NEW" } }),
    prisma.researchRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { promptTemplate: true, entry: true },
    }),
    prisma.researchEntry.findMany({
      where: activeFilter,
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        claims: { take: 1 },
        risks: { take: 1 },
        analystTargets: { take: 1 },
        verdicts: { take: 1 },
      },
    }),
    prisma.parsedTickerMention.findMany({
      where: { entry: activeFilter },
      select: { ticker: true },
    }),
    prisma.parsedVerdict.findMany({
      where: { stance: "RESEARCH_NOW", entry: activeFilter },
      include: { entry: true },
      orderBy: { priority: "asc" },
      take: 5,
    }),
  ]);

  // Aggregate top tickers
  const topTickers = Object.entries(
    mentions.reduce<Record<string, number>>((acc, item) => {
      acc[item.ticker] = (acc[item.ticker] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Fetch Grounded Movers from Flask API
  let movers: { gainers: any[]; losers: any[] } | null = null;
  try {
    const moversRes = await fetch("http://localhost:5001/api/terminal/movers?top_n=5", {
      signal: AbortSignal.timeout(1000),
    });
    if (moversRes.ok) {
      const moversData = await moversRes.json();
      const rawMovers = moversData.movers || moversData.data || moversData;
      if (rawMovers && (rawMovers.gainers || rawMovers.losers)) {
        movers = {
          gainers: Array.isArray(rawMovers.gainers) ? rawMovers.gainers.slice(0, 4) : [],
          losers: Array.isArray(rawMovers.losers) ? rawMovers.losers.slice(0, 4) : [],
        };
      }
    }
  } catch (e) {
    movers = null;
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Title block */}
      <div className="page-header">
        <div>
          <div className="eyebrow">Local research cockpit</div>
          <h1 className="page-title">Signal Desk</h1>
          <p className="page-subtitle">
            Structured prompt runs, pasted research outputs, parseable claims, ticker discovery, and lightweight market context for the AI infrastructure story.
          </p>
        </div>
        <Link href="/builder" className="btn btn-primary shrink-0">
          New run <ArrowRight size={16} />
        </Link>
      </div>

      {/* Grounded Movers Strip if Flask is online */}
      {movers && (
        <section className="panel panel-pad bg-[var(--panel)] grid gap-4 md:grid-cols-2">
          {/* Top gainers */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--good)] flex items-center gap-1">
              <TrendingUp size={14} /> Top Grounded Gainers
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {movers.gainers.map((m: any, idx: number) => {
                const isPos = m.change_pct && m.change_pct > 0;
                return (
                  <Link
                    key={idx}
                    href={`/tickers/${m.ticker}`}
                    className="p-2 rounded bg-[var(--bg)] border border-[var(--border)]/50 hover:border-[var(--accent)] flex items-center justify-between text-xs transition"
                  >
                    <span className="font-mono font-bold text-[var(--text)]">${m.ticker}</span>
                    <span className="font-mono font-semibold text-[var(--good)]">
                      {isPos ? "+" : ""}{(m.change_pct * 100).toFixed(2)}%
                    </span>
                  </Link>
                );
              })}
              {movers.gainers.length === 0 && <span className="text-xs text-[var(--muted)]">None found</span>}
            </div>
          </div>

          {/* Top losers */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--bad)] flex items-center gap-1">
              <TrendingDown size={14} /> Top Grounded Losers
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {movers.losers.map((m: any, idx: number) => {
                return (
                  <Link
                    key={idx}
                    href={`/tickers/${m.ticker}`}
                    className="p-2 rounded bg-[var(--bg)] border border-[var(--border)]/50 hover:border-[var(--accent)] flex items-center justify-between text-xs transition"
                  >
                    <span className="font-mono font-bold text-[var(--text)]">${m.ticker}</span>
                    <span className="font-mono font-semibold text-[var(--bad)]">
                      {(m.change_pct * 100).toFixed(2)}%
                    </span>
                  </Link>
                );
              })}
              {movers.losers.length === 0 && <span className="text-xs text-[var(--muted)]">None found</span>}
            </div>
          </div>
        </section>
      )}

      {/* Stats Counter Row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Prompt templates" value={promptCount} icon={<Library size={17} />} />
        <Stat label="Favorite prompts" value={favoriteCount} icon={<Compass size={17} />} />
        <Stat label="Active research" value={activeResearchCount} icon={<BookOpenText size={17} />} />
        <Stat label="Themes" value={themeCount} icon={<Tags size={17} />} />
        <Stat label="New discoveries" value={newDiscoveries} icon={<Search size={17} />} />
      </section>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        
        {/* LEFT COLUMN: RESEARCH-NOW QUEUE & LATEST RESEARCH */}
        <div className="space-y-4">
          
          {/* Research-Now Priority Queue */}
          <section className="panel panel-pad bg-[var(--panel)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={18} className="text-amber-500" /> Research-Now Active Queue
                </h2>
                <p className="text-xs text-[var(--muted)]">Highest-conviction analyst verdicts requiring action.</p>
              </div>
              <Link href="/insights" className="btn text-xs">
                Analytics
              </Link>
            </div>
            
            <div className="space-y-2.5">
              {researchNowVerdicts.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded border border-amber-500/20 bg-amber-500/[0.02] hover:border-amber-500/50 flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded uppercase font-mono bg-amber-500/10 text-amber-500">
                        RESEARCH NOW
                      </span>
                      {v.ticker && (
                        <Link href={`/tickers/${v.ticker}`} className="text-xs font-mono font-bold text-[var(--accent)] hover:underline">
                          ${v.ticker}
                        </Link>
                      )}
                      {v.themeSlug && (
                        <span className="text-[10px] text-[var(--muted)] font-mono">
                          {v.themeSlug}
                        </span>
                      )}
                      {v.priority && (
                        <span className="badge text-[9px] font-mono">Priority {v.priority}</span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--text)] font-semibold">{v.rationale}</p>
                  </div>
                  
                  <div className="shrink-0 text-right sm:self-center">
                    <Link
                      href={`/research/${v.entryId}`}
                      className="text-[10px] text-[var(--accent)] font-semibold flex items-center gap-0.5 justify-end hover:underline"
                    >
                      Deep Dive <ArrowUpRight size={12} />
                    </Link>
                    <span className="text-[9px] text-[var(--muted)] block mt-0.5">{v.entry.title}</span>
                  </div>
                </div>
              ))}
              {researchNowVerdicts.length === 0 && (
                <Empty text="No active high-priority RESEARCH_NOW verdicts. Run templates in the builder." />
              )}
            </div>
          </section>

          {/* Latest Research Ledger */}
          <section className="panel panel-pad bg-[var(--panel)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-1.5">
                  <Activity size={18} className="text-[var(--accent)]" /> Latest Parsed Research
                </h2>
                <p className="text-xs text-[var(--muted)]">Chronological research logs added to the active evidence system.</p>
              </div>
              <Link href="/research" className="btn text-xs">
                Library
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {latestResearch.map((entry) => (
                <article
                  key={entry.id}
                  className="p-3 rounded-md border border-[var(--border)] bg-[var(--bg)]/30 hover:border-[var(--accent)] transition flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/research/${entry.id}`} className="font-bold text-xs hover:underline hover:text-[var(--accent)] text-[var(--text)] line-clamp-1">
                        {entry.title}
                      </Link>
                      <span className="badge text-[9px] uppercase font-mono">{entry.parseStatus}</span>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]">
                      {entry.summary || entry.rawOutput.slice(0, 180)}
                    </p>
                  </div>
                  
                  <div className="mt-3 pt-2.5 border-t border-[var(--border)]/40 flex flex-wrap gap-1">
                    <span className="badge text-[9px]">{entry.claims.length} claims</span>
                    <span className="badge text-[9px]">{entry.risks.length} risks</span>
                    <span className="badge text-[9px]">{entry.verdicts.length} verdicts</span>
                  </div>
                </article>
              ))}
              {latestResearch.length === 0 && (
                <div className="sm:col-span-2">
                  <Empty text="Paste an LLM output in the capture step to build the parsed signal grid." />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: RECENT RUNS & TOP TICKERS */}
        <div className="space-y-4">
          
          {/* Top Mentioned Tickers */}
          <section className="panel panel-pad bg-[var(--panel)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Top Mentioned Tickers</h2>
                <p className="text-xs text-[var(--muted)]">Aggregated from all active parsed entries.</p>
              </div>
              <Link href="/insights" className="btn text-xs">
                Charts
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topTickers.map(([ticker, count]) => (
                <Link
                  key={ticker}
                  href={`/tickers/${ticker}`}
                  className="badge font-mono text-[10px] font-bold bg-[var(--bg)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
                >
                  ${ticker} · {count}
                </Link>
              ))}
              {topTickers.length === 0 && (
                <Empty text="Ticker mentions will appear after research is parsed." />
              )}
            </div>
          </section>

          {/* Recent Runs */}
          <section className="panel panel-pad bg-[var(--panel)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Recent Builder Runs</h2>
                <p className="text-xs text-[var(--muted)]">Templates rendered in the prompt laboratory.</p>
              </div>
              <Link href="/runs" className="btn text-xs">
                History
              </Link>
            </div>
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <div key={run.id} className="rounded border border-[var(--border)] p-2.5 bg-[var(--bg)]/20 text-xs">
                  <div className="flex items-center justify-between gap-2 font-medium">
                    <span className="truncate">{run.promptTemplate?.title || "Ad hoc run"}</span>
                    <span className="badge text-[9px] uppercase">{run.status}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--muted)] flex justify-between">
                    <span>{run.sourceApp} · {formatDate(run.createdAt)}</span>
                    {run.entry && (
                      <Link href={`/research/${run.entry.id}`} className="text-[var(--accent)] hover:underline font-semibold">
                        View entry
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {recentRuns.length === 0 && <Empty text="No prompt runs launched yet." />}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="panel panel-pad bg-[var(--panel)]">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded bg-[var(--soft)] text-[var(--muted)]">
        {icon}
      </div>
      <div className="text-2xl font-black text-[var(--text)]">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted)] bg-[var(--bg)]/10">
      {text}
    </div>
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
