"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldAlert,
  Target,
  Clock,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Newspaper,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { prettifyEnum } from "@/lib/enums";
import { refreshTickerDataAction } from "@/app/actions";

type SnapshotType = {
  price: number | null;
  marketCap: number | null;
  week52High: number | null;
  week52Low: number | null;
  forwardPe: number | null;
  trailingPe: number | null;
  analystMeanTarget: number | null;
  ytdReturnPct: number | null;
  oneMonthReturnPct: number | null;
  threeMonthReturnPct: number | null;
  sixMonthReturnPct: number | null;
  oneYearReturnPct: number | null;
  asOf: string;
  // Phase 2 defensive columns
  sector: string | null;
  beta: number | null;
  sectorMomentumPercentile: number | null;
  forwardPeSectorAvg: number | null;
  spotlightTags: string[];
  dataSource: string;
};

type TickerClientProps = {
  symbol: string;
  companyName: string | null;
  notes: string | null;
  dataStatus: string;
  snapshot: SnapshotType | null;
  verdicts: Array<{ id: string; entryId: string; entryTitle: string; stance: string; priority: number | null; horizon: string | null; rationale: string; createdAt: string }>;
  risks: Array<{ id: string; entryId: string; entryTitle: string; text: string; severity: string | null; timeframe: string | null; sourceUrl: string | null }>;
  catalysts: Array<{ id: string; entryId: string; entryTitle: string; text: string; importance: string | null; timeframe: string | null; sourceUrl: string | null }>;
  targets: Array<{ id: string; entryId: string; entryTitle: string; firm: string | null; rating: string | null; target: number | null; previousTarget: number | null; date: string | null }>;
  mentions: Array<{ id: string; entryId: string; entryTitle: string; sentiment: string | null; confidence: number | null; role: string | null }>;
  questions: Array<{ id: string; entryId: string; entryTitle: string; text: string }>;
  liveNews: Array<{ headline: string; source: string; summary: string; url?: string; time: string }> | null;
  liveCatalysts: Array<{ event_type: string; event_date: string; description: string; source: string }> | null;
};

export function TickerClient({
  symbol,
  companyName,
  notes,
  dataStatus,
  snapshot,
  verdicts,
  risks,
  catalysts,
  targets,
  mentions,
  questions,
  liveNews,
  liveCatalysts,
}: TickerClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "live">("overview");
  const [isPending, startTransition] = useTransition();
  const [refreshState, setRefreshState] = useState<string | null>(null);

  function handleRefresh() {
    setRefreshState("refreshing");
    startTransition(async () => {
      try {
        await refreshTickerDataAction([symbol]);
        setRefreshState("success");
        setTimeout(() => setRefreshState(null), 2500);
      } catch (err: any) {
        setRefreshState(`error: ${err?.message || "Failed"}`);
        setTimeout(() => setRefreshState(null), 3000);
      }
    });
  }

  // Aggregate Sentiment Mentions
  const sentimentsCount = mentions.reduce(
    (acc, m) => {
      if (m.sentiment) acc[m.sentiment] = (acc[m.sentiment] || 0) + 1;
      return acc;
    },
    { BULLISH: 0, BEARISH: 0, NEUTRAL: 0, MIXED: 0 } as Record<string, number>
  );

  const totalSentiments = Object.values(sentimentsCount).reduce((a, b) => a + b, 0);
  const bullishPct = totalSentiments > 0 ? Math.round(((sentimentsCount.BULLISH + sentimentsCount.MIXED * 0.5) / totalSentiments) * 100) : null;

  // Analyst target vs current price gap
  const currentPrice = snapshot?.price ?? null;
  const meanTarget = snapshot?.analystMeanTarget ?? null;
  const targetGapPct = currentPrice && meanTarget ? Math.round(((meanTarget - currentPrice) / currentPrice) * 1000) / 10 : null;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <header className="panel panel-pad relative overflow-hidden bg-gradient-to-br from-[var(--panel)] to-[var(--soft)]/10">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none font-bold text-9xl select-none font-mono">
          {symbol}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-[var(--text)]">${symbol}</span>
              <span className={`badge text-[10px] ${dataStatus === "VERIFIED" ? "bg-[var(--good)]/10 border-[var(--good)]/30 text-[var(--good)]" : "bg-[var(--warn)]/10 border-[var(--warn)]/30 text-[var(--warn)]"}`}>
                {dataStatus}
              </span>
              {snapshot && (() => {
                const isStale = Date.now() - new Date(snapshot.asOf).getTime() > 6 * 60 * 60 * 1000;
                let badgeText = "";
                let badgeClass = "";
                if (isStale) {
                  badgeText = "Stale >6h";
                  badgeClass = "bg-[var(--bad)]/10 border-[var(--bad)]/30 text-[var(--bad)]";
                } else if (snapshot.dataSource === "finance") {
                  badgeText = "Live (finance)";
                  badgeClass = "bg-[var(--good)]/10 border-[var(--good)]/30 text-[var(--good)]";
                } else {
                  badgeText = "Yahoo fallback";
                  badgeClass = "bg-[var(--muted)]/10 border-[var(--border)] text-[var(--muted)]";
                }
                return (
                  <span className={`badge text-[10px] ${badgeClass}`}>
                    {badgeText}
                  </span>
                );
              })()}
            </div>
            {companyName && <h1 className="text-lg font-bold text-[var(--muted)]">{companyName}</h1>}
            
            {snapshot?.sector && (
              <p className="text-xs text-[var(--muted)]">
                Sector: <span className="font-semibold text-[var(--text)]">{snapshot.sector}</span>
              </p>
            )}

            {/* Spotlight tags */}
            {snapshot?.spotlightTags && snapshot.spotlightTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {snapshot.spotlightTags.map((tag, idx) => (
                  <span key={idx} className="badge text-[9px] font-semibold bg-[var(--soft)] text-[var(--muted)] px-2 py-0.5 border-[var(--border)] rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {refreshState && (
              <span className="text-xs px-2 py-1 rounded bg-[var(--soft)] text-[var(--muted)] font-mono">
                {refreshState === "refreshing" ? "Syncing API..." : "Cache synched."}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="btn text-xs flex items-center gap-1.5 border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--soft)]"
            >
              <RefreshCw size={13} className={refreshState === "refreshing" ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>
        </div>

        {notes && (
          <p className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)] leading-relaxed bg-[var(--bg)]/40 p-2.5 rounded">
            <strong>Analyst Notes:</strong> {notes}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-[var(--muted)] border-t border-[var(--border)]/50 pt-2 font-mono">
          <span>Grounded Source: <strong className="text-[var(--text)]">{snapshot?.dataSource || "Yahoo Fallback"}</strong></span>
          {snapshot?.asOf && (
            <span>Snapshot As Of: <strong className="text-[var(--text)]">{new Date(snapshot.asOf).toLocaleString()}</strong></span>
          )}
        </div>
      </header>

      {/* QUICK CONSENSUS PANEL */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sentiment Consensus */}
        <div className="panel panel-pad flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-2">Sentiment Consensus</div>
            {bullishPct !== null ? (
              <div className="space-y-1">
                <div className="text-2xl font-black text-[var(--text)]">{bullishPct}% Bullish</div>
                <div className="text-[10px] text-[var(--muted)]">
                  Based on {totalSentiments} mention(s) ({sentimentsCount.BULLISH} Bullish / {sentimentsCount.BEARISH} Bearish)
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-[var(--muted)] italic py-2">No parsed sentiments yet.</div>
            )}
          </div>
          {bullishPct !== null && (
            <div className="h-1.5 w-full bg-[var(--soft)] rounded-full overflow-hidden mt-3">
              <div className="h-full bg-[var(--good)] rounded-full" style={{ width: `${bullishPct}%` }} />
            </div>
          )}
        </div>

        {/* Target Price & Gap */}
        <div className="panel panel-pad flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-2">Analyst Mean Target</div>
            {meanTarget ? (
              <div className="space-y-1">
                <div className="text-2xl font-black text-[var(--text)]">${meanTarget}</div>
                {targetGapPct !== null && (
                  <div className={`text-[10px] flex items-center gap-1 ${targetGapPct > 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
                    {targetGapPct > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {targetGapPct > 0 ? `+${targetGapPct}% gap` : `${targetGapPct}% gap`} from price (${currentPrice})
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm font-medium text-[var(--muted)] italic py-2">No target price grounded.</div>
            )}
          </div>
        </div>

        {/* Valuation (PE) vs Sector */}
        <div className="panel panel-pad flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-2">Grounded Forward PE</div>
            {snapshot?.forwardPe ? (
              <div className="space-y-1">
                <div className="text-2xl font-black text-[var(--text)]">{snapshot.forwardPe}x</div>
                {snapshot.forwardPeSectorAvg && (
                  <div className="text-[10px] text-[var(--muted)]">
                    vs Sector Avg: <span className="font-semibold text-[var(--text)]">{snapshot.forwardPeSectorAvg}x</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm font-medium text-[var(--muted)] italic py-2">No PE metrics available.</div>
            )}
          </div>
        </div>

        {/* Sector Momentum */}
        <div className="panel panel-pad flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-2">Sector Momentum</div>
            {snapshot?.sectorMomentumPercentile !== null && snapshot?.sectorMomentumPercentile !== undefined ? (
              <div className="space-y-1">
                <div className="text-2xl font-black text-[var(--text)]">
                  {Math.round(snapshot.sectorMomentumPercentile)}th
                </div>
                <div className="text-[10px] text-[var(--muted)]">Percentile ranking in sector</div>
              </div>
            ) : (
              <div className="text-sm font-medium text-[var(--muted)] italic py-2">No momentum grounded.</div>
            )}
          </div>
          {snapshot?.sectorMomentumPercentile !== null && snapshot?.sectorMomentumPercentile !== undefined && (
            <div className="h-1.5 w-full bg-[var(--soft)] rounded-full overflow-hidden mt-3">
              <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.min(100, Math.max(0, Math.round(snapshot.sectorMomentumPercentile)))}%` }} />
            </div>
          )}
        </div>
      </section>

      {/* TABS CONTAINER */}
      <div className="border-b border-[var(--border)] flex gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2 px-3 text-sm font-semibold transition ${activeTab === "overview" ? "border-b-2 border-[var(--text)] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
        >
          Valuation & Performance
        </button>
        <button
          onClick={() => setActiveTab("evidence")}
          className={`pb-2 px-3 text-sm font-semibold transition ${activeTab === "evidence" ? "border-b-2 border-[var(--text)] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
        >
          Evidence Ledger ({verdicts.length + risks.length + catalysts.length})
        </button>
        <button
          onClick={() => setActiveTab("live")}
          className={`pb-2 px-3 text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === "live" ? "border-b-2 border-[var(--text)] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
        >
          Live Terminal Feed
          {liveNews && liveNews.length > 0 && <span className="h-2 w-2 bg-[var(--good)] rounded-full animate-pulse" />}
        </button>
      </div>

      {/* TAB CONTENT: VALUATION & PERFORMANCE OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Grounded Financial Metrics */}
          <div className="panel panel-pad space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1">
              <Activity size={14} className="text-[var(--accent)]" /> Grounded Snapshot Metrics
            </h3>
            {snapshot ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <MetricItem label="Current Price" value={snapshot.price ? `$${snapshot.price}` : "—"} />
                <MetricItem label="Market Cap" value={snapshot.marketCap ? `$${(snapshot.marketCap / 1e9).toFixed(2)}B` : "—"} />
                <MetricItem label="52 Week High" value={snapshot.week52High ? `$${snapshot.week52High}` : "—"} />
                <MetricItem label="52 Week Low" value={snapshot.week52Low ? `$${snapshot.week52Low}` : "—"} />
                <MetricItem label="Trailing PE" value={snapshot.trailingPe ? `${snapshot.trailingPe}x` : "—"} />
                <MetricItem label="Forward PE" value={snapshot.forwardPe ? `${snapshot.forwardPe}x` : "—"} />
                <MetricItem label="Grounded Beta" value={snapshot.beta ? `${snapshot.beta.toFixed(2)}` : "—"} />
                <MetricItem label="Data Source" value={snapshot.dataSource} />
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)] italic p-6 text-center">No grounded metrics snapshot found.</p>
            )}
          </div>

          {/* Performance & Returns */}
          <div className="panel panel-pad space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1">
              <TrendingUp size={14} className="text-[var(--good)]" /> Performance & Historical Returns
            </h3>
            {snapshot ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <ReturnItem label="YTD Return" value={snapshot.ytdReturnPct} />
                <ReturnItem label="1 Month Return" value={snapshot.oneMonthReturnPct} />
                <ReturnItem label="3 Month Return" value={snapshot.threeMonthReturnPct} />
                <ReturnItem label="6 Month Return" value={snapshot.sixMonthReturnPct} />
                <ReturnItem label="1 Year Return" value={snapshot.oneYearReturnPct} />
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)] italic p-6 text-center">No performance snapshots found.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: EVIDENCE LEDGER LISTINGS */}
      {activeTab === "evidence" && (
        <div className="space-y-6">
          {/* Active Verdicts for this symbol */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-1 flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[var(--good)]" /> Parsed Analyst Verdicts ({verdicts.length})
            </h3>
            <div className="space-y-3">
              {verdicts.map((v) => (
                <div key={v.id} className="panel panel-pad space-y-2 hover:shadow transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase ${v.stance === "RESEARCH_NOW" ? "bg-amber-500/10 text-amber-500" : v.stance === "WATCH" ? "bg-blue-500/10 text-blue-500" : v.stance === "AVOID" ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-400"}`}>
                        {prettifyEnum(v.stance)}
                      </span>
                      {v.priority && <span className="badge text-[9px] font-mono">Priority {v.priority}</span>}
                      {v.horizon && <span className="text-[10px] text-[var(--muted)]">Horizon: {prettifyEnum(v.horizon)}</span>}
                    </div>
                    <span className="text-[9px] font-mono text-[var(--muted)]">{v.createdAt}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--text)] font-medium bg-[var(--bg)] p-2.5 rounded border border-[var(--border)]/40">
                    {v.rationale}
                  </p>
                  <div className="text-[10px] text-[var(--muted)]">
                    Evidence source entry:{" "}
                    <Link href={`/research/${v.entryId}`} className="text-[var(--accent)] hover:underline font-semibold">
                      {v.entryTitle}
                    </Link>
                  </div>
                </div>
              ))}
              {verdicts.length === 0 && (
                <p className="text-xs text-[var(--muted)] italic p-4 text-center">No verdicts found for this symbol.</p>
              )}
            </div>
          </section>

          {/* Risks & Catalysts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Risks */}
            <div className="panel panel-pad space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-[var(--bad)]" /> Risks & Severity ({risks.length})
              </h3>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {risks.map((risk) => (
                  <div key={risk.id} className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded text-xs space-y-1.5">
                    <p className="leading-relaxed text-[var(--text)]">{risk.text}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--muted)] pt-1 border-t border-[var(--border)]/40">
                      <div className="flex gap-2">
                        {risk.severity && (
                          <span className={`font-semibold ${risk.severity === "HIGH" ? "text-[var(--bad)]" : risk.severity === "MEDIUM" ? "text-[var(--warn)]" : "text-[var(--good)]"}`}>
                            {risk.severity} Severity
                          </span>
                        )}
                        {risk.timeframe && <span>{risk.timeframe}</span>}
                      </div>
                      <Link href={`/research/${risk.entryId}`} className="text-[var(--accent)] hover:underline text-[9px]">
                        source
                      </Link>
                    </div>
                  </div>
                ))}
                {risks.length === 0 && (
                  <p className="text-xs text-[var(--muted)] italic p-6 text-center">No parsed risks for this symbol.</p>
                )}
              </div>
            </div>

            {/* Catalysts */}
            <div className="panel panel-pad space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
                <Target size={15} className="text-[var(--good)]" /> Catalysts & Timeline ({catalysts.length})
              </h3>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {catalysts.map((cat) => (
                  <div key={cat.id} className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded text-xs space-y-1.5">
                    <p className="leading-relaxed text-[var(--text)]">{cat.text}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--muted)] pt-1 border-t border-[var(--border)]/40">
                      <div className="flex gap-2">
                        {cat.importance && (
                          <span className={`font-semibold ${cat.importance === "HIGH" ? "text-[var(--bad)]" : "text-[var(--warn)]"}`}>
                            {cat.importance} Importance
                          </span>
                        )}
                        {cat.timeframe && <span>{cat.timeframe}</span>}
                      </div>
                      <Link href={`/research/${cat.entryId}`} className="text-[var(--accent)] hover:underline text-[9px]">
                        source
                      </Link>
                    </div>
                  </div>
                ))}
                {catalysts.length === 0 && (
                  <p className="text-xs text-[var(--muted)] italic p-6 text-center">No parsed catalysts for this symbol.</p>
                )}
              </div>
            </div>
          </div>

          {/* Analyst target adjustments history & Open Questions */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Price Targets history */}
            <div className="panel panel-pad space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
                <Target size={15} className="text-[var(--good)]" /> analyst target adjustments ({targets.length})
              </h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {targets.map((at) => (
                  <div key={at.id} className="p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs flex justify-between items-center hover:border-[var(--accent)] transition">
                    <div>
                      <div className="font-bold text-[var(--text)]">{at.firm || "Unknown Firm"}</div>
                      <div className="text-[10px] text-[var(--muted)]">Rating: {at.rating || "—"} · {at.date ? new Date(at.date).toLocaleDateString() : ""}</div>
                    </div>
                    {at.target && (
                      <div className="font-mono font-bold text-[var(--text)]">
                        {at.previousTarget ? (
                          <span className="text-[10px] text-[var(--muted)] font-normal line-through mr-1.5">${at.previousTarget}</span>
                        ) : null}
                        <span className={at.previousTarget && at.target > at.previousTarget ? "text-[var(--good)]" : at.previousTarget && at.target < at.previousTarget ? "text-[var(--bad)]" : ""}>
                          ${at.target}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {targets.length === 0 && (
                  <p className="text-xs text-[var(--muted)] italic p-4 text-center">No analyst target edits found.</p>
                )}
              </div>
            </div>

            {/* Ticker-specific follow-up questions */}
            <div className="panel panel-pad space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
                <HelpCircle size={15} className="text-[var(--warn)]" /> Open Research Questions ({questions.length})
              </h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {questions.map((q) => (
                  <div key={q.id} className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded text-xs space-y-1 hover:border-[var(--accent)] transition">
                    <p className="font-medium text-[var(--text)]">? {q.text}</p>
                    <div className="text-[9px] text-[var(--muted)] flex justify-between">
                      <span>Source: {q.entryTitle}</span>
                      <Link href={`/research/${q.entryId}`} className="text-[var(--accent)] hover:underline">
                        view entry
                      </Link>
                    </div>
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="text-xs text-[var(--muted)] italic p-4 text-center">No open questions for this symbol.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LIVE TERMINAL FEED FROM LOCAL FLASK API */}
      {activeTab === "live" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Live News Terminal */}
          <div className="panel panel-pad space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
              <Newspaper size={15} className="text-[var(--accent)]" /> Live News Tape
            </h3>
            {liveNews ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {liveNews.map((n, idx) => (
                  <div key={idx} className="p-2.5 rounded border border-[var(--border)] hover:border-[var(--accent)] bg-[var(--bg)] transition">
                    <div className="flex justify-between gap-2 text-[10px] text-[var(--muted)] mb-1 font-mono">
                      <span>{n.source}</span>
                      <span>{n.time}</span>
                    </div>
                    <h4 className="text-xs font-bold leading-snug mb-1 text-[var(--text)]">{n.headline}</h4>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">{n.summary}</p>
                  </div>
                ))}
                {liveNews.length === 0 && (
                  <p className="text-xs text-[var(--muted)] italic p-6 text-center">No recent news tape found for ${symbol}.</p>
                )}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-[var(--border)] rounded text-xs text-[var(--muted)] space-y-2">
                <AlertCircle size={20} className="mx-auto text-[var(--warn)]" />
                <p className="font-medium">Live Terminal Feed Offline</p>
                <p className="text-[10px]">Start the Flask finance analysis API (on localhost:5001) to fetch cited real-time news headlines.</p>
              </div>
            )}
          </div>

          {/* Upcoming Catalysts */}
          <div className="panel panel-pad space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
              <Calendar size={15} className="text-[var(--good)]" /> Upcoming Grounded Catalysts
            </h3>
            {liveCatalysts ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {liveCatalysts.map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded border border-[var(--border)] hover:border-[var(--good)] bg-[var(--bg)] transition">
                    <div className="flex justify-between gap-2 text-[10px] text-[var(--muted)] mb-1 font-mono">
                      <span className="font-semibold text-[var(--good)] uppercase">{prettifyEnum(c.event_type)}</span>
                      <span>{c.event_date}</span>
                    </div>
                    <p className="text-xs text-[var(--text)] leading-relaxed font-medium">{c.description}</p>
                    <div className="text-[9px] text-[var(--muted)] font-mono mt-1">Source: {c.source}</div>
                  </div>
                ))}
                {liveCatalysts.length === 0 && (
                  <p className="text-xs text-[var(--muted)] italic p-6 text-center">No upcoming macro/corporate catalysts recorded for ${symbol}.</p>
                )}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-[var(--border)] rounded text-xs text-[var(--muted)] space-y-2">
                <AlertCircle size={20} className="mx-auto text-[var(--warn)]" />
                <p className="font-medium">Live Grounded Catalysts Offline</p>
                <p className="text-[10px]">Start the Flask finance analysis API (on localhost:5001) to fetch verified corporate calendars.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-[var(--bg)] border border-[var(--border)]/50 flex justify-between items-center">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className="font-semibold text-[var(--text)] font-mono">{value}</span>
    </div>
  );
}

function ReturnItem({ label, value }: { label: string; value: number | null }) {
  const isPos = value && value > 0;
  return (
    <div className="p-2 rounded bg-[var(--bg)] border border-[var(--border)]/50 flex justify-between items-center">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      {value !== null && value !== undefined ? (
        <span className={`font-semibold font-mono ${isPos ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
          {isPos ? "+" : ""}{value.toFixed(2)}%
        </span>
      ) : (
        <span className="text-xs text-[var(--muted)] font-mono">—</span>
      )}
    </div>
  );
}
