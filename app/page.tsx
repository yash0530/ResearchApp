import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpenText, Compass, Library, Search, Tags } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [promptCount, favoriteCount, activeResearchCount, themeCount, newDiscoveries, recentRuns, latestResearch, mentions] =
    await Promise.all([
      prisma.promptTemplate.count(),
      prisma.promptTemplate.count({ where: { isFavorite: true } }),
      prisma.researchEntry.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.theme.count(),
      prisma.discoveryCandidate.count({ where: { status: "NEW" } }),
      prisma.researchRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { promptTemplate: true, entry: true },
      }),
      prisma.researchEntry.findMany({
        where: { deletedAt: null, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          claims: { take: 2 },
          risks: { take: 2 },
          analystTargets: { take: 2 },
        },
      }),
      prisma.parsedTickerMention.findMany({
        where: { entry: { deletedAt: null, status: "ACTIVE" } },
        select: { ticker: true },
      }),
    ]);

  const topTickers = Object.entries(
    mentions.reduce<Record<string, number>>((acc, item) => {
      acc[item.ticker] = (acc[item.ticker] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Local research cockpit</div>
          <h1 className="page-title">Signal Desk</h1>
          <p className="page-subtitle">
            Structured prompt runs, pasted research outputs, parseable claims, ticker discovery, and lightweight market context for the AI infrastructure story.
          </p>
        </div>
        <Link href="/builder" className="btn btn-primary">
          New run <ArrowRight size={16} />
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Prompt templates" value={promptCount} icon={<Library size={17} />} />
        <Stat label="Favorite prompts" value={favoriteCount} icon={<Compass size={17} />} />
        <Stat label="Active research" value={activeResearchCount} icon={<BookOpenText size={17} />} />
        <Stat label="Themes" value={themeCount} icon={<Tags size={17} />} />
        <Stat label="New discoveries" value={newDiscoveries} icon={<Search size={17} />} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel panel-pad">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent Runs</h2>
              <p className="text-sm text-[var(--muted)]">The latest prompts created from the builder.</p>
            </div>
            <Link href="/runs" className="btn">
              Runs
            </Link>
          </div>
          <div className="space-y-3">
            {recentRuns.map((run) => (
              <div key={run.id} className="rounded-md border border-[var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{run.promptTemplate?.title || "Ad hoc run"}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {run.sourceApp} · {run.status} · {formatDate(run.createdAt)}
                    </div>
                  </div>
                  <span className="badge">{run.entry ? "Output saved" : "Awaiting output"}</span>
                </div>
              </div>
            ))}
            {!recentRuns.length && <Empty text="No prompt runs yet. Start in the builder." />}
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Top Mentioned Tickers</h2>
              <p className="text-sm text-[var(--muted)]">Parsed from active research entries.</p>
            </div>
            <Link href="/insights" className="btn">
              Insights
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {topTickers.map(([ticker, count]) => (
              <span key={ticker} className="badge">
                {ticker} · {count}
              </span>
            ))}
            {!topTickers.length && <Empty text="Ticker mentions will appear after parsed research is saved." />}
          </div>
        </div>
      </section>

      <section className="mt-4 panel panel-pad">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Latest Research</h2>
            <p className="text-sm text-[var(--muted)]">Active entries only; stale, incorrect, archived, and deleted work is hidden by default.</p>
          </div>
          <Link href="/research" className="btn">
            Library
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {latestResearch.map((entry) => (
            <article key={entry.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{entry.title}</h3>
                <span className="badge">{entry.parseStatus}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{entry.summary || entry.rawOutput.slice(0, 220)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge">{entry.claims.length} claims</span>
                <span className="badge">{entry.risks.length} risks</span>
                <span className="badge">{entry.analystTargets.length} targets</span>
              </div>
            </article>
          ))}
          {!latestResearch.length && <Empty text="Paste an external-agent output into a run to build the research ledger." />}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="panel panel-pad">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-[var(--soft)] text-[var(--muted)]">{icon}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">{text}</div>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
