"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ArchiveRestore,
  Sparkles,
  Clock,
  Target,
  ShieldAlert,
  BrainCircuit,
  CheckCircle2,
  HelpCircle,
  Activity,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  updateResearchStatusAction,
  softDeleteResearchAction,
  restoreResearchAction,
  saveResearchOutputAction,
} from "@/app/actions";
import { RESEARCH_STATUSES, RESEARCH_STATUS_LABELS } from "@/lib/enums";
import { prettifyEnum } from "@/lib/enums";

type DetailEntry = {
  id: string;
  runId: string | null;
  title: string;
  sourceApp: string;
  rawOutput: string;
  summary: string | null;
  notes: string | null;
  status: string;
  parseStatus: string;
  parseError: string | null;
  ignoredLines: string[];
  deletedAt: string | null;
  updatedAt: string;
  claims: Array<{ id: string; text: string; ticker: string | null; themeSlug: string | null; confidence: number | null; importance: string | null; sourceUrl: string | null }>;
  risks: Array<{ id: string; text: string; ticker: string | null; themeSlug: string | null; severity: string | null; timeframe: string | null; sourceUrl: string | null }>;
  catalysts: Array<{ id: string; text: string; ticker: string | null; themeSlug: string | null; importance: string | null; timeframe: string | null; sourceUrl: string | null }>;
  tickerMentions: Array<{ id: string; ticker: string; themeSlug: string | null; sentiment: string | null; confidence: number | null; role: string | null }>;
  analystTargets: Array<{ id: string; ticker: string; firm: string | null; rating: string | null; target: number | null; previousTarget: number | null; date: string | null; sourceUrl: string | null }>;
  themeSignals: Array<{ id: string; themeSlug: string; cycle: string | null; crowding: string | null; confidence: number | null; summary: string | null }>;
  verdicts: Array<{ id: string; ticker: string | null; themeSlug: string | null; stance: string; priority: number | null; horizon: string | null; rationale: string }>;
  questions: Array<{ id: string; text: string; ticker: string | null; themeSlug: string | null }>;
  watchItems: Array<{ id: string; text: string; ticker: string | null; themeSlug: string | null; timeframe: string | null }>;
};

export function EntryDetailClient({ entry }: { entry: DetailEntry }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reparseStatus, setReparseStatus] = useState<string | null>(null);

  function setStatus(status: string) {
    startTransition(() => {
      updateResearchStatusAction(entry.id, status as never);
    });
  }

  function softDelete() {
    if (!window.confirm("Soft-delete this research entry? It can be recovered later.")) return;
    startTransition(async () => {
      await softDeleteResearchAction(entry.id);
      router.push("/research");
    });
  }

  function restore() {
    startTransition(() => {
      restoreResearchAction(entry.id);
    });
  }

  function handleReparse() {
    setReparseStatus("parsing");
    startTransition(async () => {
      try {
        const res = await saveResearchOutputAction({
          runId: entry.runId || undefined,
          title: entry.title,
          rawOutput: entry.rawOutput,
          summary: entry.summary || undefined,
          notes: entry.notes || undefined,
          sourceApp: entry.sourceApp as never,
        });
        setReparseStatus(`success: parsed ${res.ignoredCount} ignored line(s)`);
        setTimeout(() => setReparseStatus(null), 3000);
      } catch (err: any) {
        setReparseStatus(`error: ${err?.message || "Failed to re-parse"}`);
        setTimeout(() => setReparseStatus(null), 5000);
      }
    });
  }

  const activeClaimsCount = entry.claims.length;
  const activeRisksCount = entry.risks.length;
  const activeCatalystsCount = entry.catalysts.length;

  return (
    <div className="space-y-6">
      {/* Back button and status banner */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/research" className="btn flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Library
        </Link>
        <div className="flex items-center gap-2">
          {reparseStatus && (
            <span className="text-xs px-2.5 py-1 rounded bg-[var(--soft)] font-mono text-[var(--muted)] animate-pulse">
              {reparseStatus}
            </span>
          )}
          <button
            onClick={handleReparse}
            disabled={isPending}
            className="btn flex items-center gap-1.5 text-xs text-[var(--accent)] border-[var(--accent)]/30 hover:bg-[var(--soft)]"
            title="Re-run the parsed block extraction from raw text"
          >
            <RefreshCw size={13} className={reparseStatus === "parsing" ? "animate-spin" : ""} /> Re-parse
          </button>
        </div>
      </div>

      {/* Main Page Title Header */}
      <header className="panel panel-pad relative overflow-hidden bg-gradient-to-r from-[var(--panel)] via-[var(--panel)] to-[var(--soft)]/20">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <BrainCircuit size={100} />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="eyebrow flex items-center gap-1.5">
              <Activity size={12} className="text-[var(--accent)]" />
              Evidence Entry Detail
            </div>
            <h1 className="text-2xl font-bold md:text-3xl text-[var(--text)]">{entry.title}</h1>
            <p className="text-xs text-[var(--muted)] font-mono">
              Source: <span className="text-[var(--text)] font-semibold">{entry.sourceApp}</span> · Status: <span className="text-[var(--text)] font-semibold">{entry.status}</span> · Parse State: <span className="text-[var(--text)] font-semibold">{entry.parseStatus}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="select w-auto text-xs"
              value={entry.status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isPending}
            >
              {RESEARCH_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {RESEARCH_STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            {entry.deletedAt ? (
              <button className="btn text-xs" onClick={restore} disabled={isPending}>
                <ArchiveRestore size={14} /> Restore Entry
              </button>
            ) : (
              <button className="btn btn-danger text-xs" onClick={softDelete} disabled={isPending}>
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>

        {entry.summary && (
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-sm leading-relaxed text-[var(--text)] bg-[color-mix(in_srgb,var(--soft)_30%,transparent)] p-3 rounded">
            <span className="font-semibold text-xs uppercase tracking-wider text-[var(--muted)] block mb-1">Executive Summary</span>
            {entry.summary}
          </div>
        )}

        {entry.notes && (
          <div className="mt-2 text-xs text-[var(--muted)] italic p-2 bg-[var(--soft)]/30 rounded border border-[var(--border)]/40">
            <strong>Analyst Notes:</strong> {entry.notes}
          </div>
        )}
      </header>

      {/* VERDICTS SECTION */}
      {entry.verdicts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[var(--good)]" /> Investment Verdicts
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {entry.verdicts.map((v) => {
              const colors: Record<string, { border: string; bg: string; text: string }> = {
                RESEARCH_NOW: { border: "border-amber-500/50", bg: "bg-amber-500/10", text: "text-amber-500" },
                WATCH: { border: "border-blue-500/50", bg: "bg-blue-500/10", text: "text-blue-500" },
                DEFER: { border: "border-gray-500/50", bg: "bg-gray-500/10", text: "text-gray-400" },
                AVOID: { border: "border-red-500/50", bg: "bg-red-500/10", text: "text-red-500" },
              };
              const c = colors[v.stance] || { border: "border-[var(--border)]", bg: "bg-[var(--soft)]", text: "text-[var(--text)]" };
              return (
                <div key={v.id} className={`panel panel-pad border-l-4 ${v.stance === "RESEARCH_NOW" ? "border-l-amber-500" : v.stance === "WATCH" ? "border-l-blue-500" : v.stance === "AVOID" ? "border-l-red-500" : "border-l-gray-400"} hover:shadow-md transition`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase font-mono ${c.bg} ${c.text}`}>
                        {prettifyEnum(v.stance)}
                      </span>
                      {v.ticker && (
                        <Link href={`/tickers/${v.ticker}`} className="text-xs font-mono font-bold text-[var(--accent)] hover:underline">
                          ${v.ticker}
                        </Link>
                      )}
                      {v.themeSlug && (
                        <span className="text-[10px] text-[var(--muted)] bg-[var(--soft)] px-1.5 py-0.5 rounded font-mono">
                          {v.themeSlug}
                        </span>
                      )}
                    </div>
                    {v.priority && (
                      <span className="badge font-mono text-[10px]">Priority {v.priority}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-relaxed mb-3 text-[var(--text)]">
                    {v.rationale}
                  </p>
                  {v.horizon && (
                    <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                      <Clock size={11} /> Horizon: <span className="text-[var(--text)] font-medium">{prettifyEnum(v.horizon)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* THEME SIGNALS */}
      {entry.themeSignals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp size={18} className="text-[var(--accent)]" /> Theme Macro Signals
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entry.themeSignals.map((ts) => (
              <div key={ts.id} className="panel panel-pad space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-mono text-[var(--accent)]">{ts.themeSlug}</span>
                  {ts.confidence && (
                    <span className="badge text-[10px] bg-[var(--soft)]">{ts.confidence}% conf.</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {ts.cycle && (
                    <span className="badge font-mono uppercase bg-[var(--soft)] text-[var(--text)]" title="Cycle stage">
                      Cycle: {prettifyEnum(ts.cycle)}
                    </span>
                  )}
                  {ts.crowding && (
                    <span className={`badge font-mono text-[10px] ${ts.crowding === "HIGH" ? "text-[var(--bad)] border-[var(--bad)]/30 bg-[var(--bad)]/5" : ts.crowding === "MEDIUM" ? "text-[var(--warn)] border-[var(--warn)]/30 bg-[var(--warn)]/5" : "text-[var(--good)] border-[var(--good)]/30 bg-[var(--good)]/5"}`}>
                      Crowding: {prettifyEnum(ts.crowding)}
                    </span>
                  )}
                </div>
                {ts.summary && <p className="text-xs text-[var(--muted)] leading-relaxed mt-2">{ts.summary}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* THREE COLUMN GRID: CLAIMS, RISKS, CATALYSTS */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Claims Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="font-bold text-sm flex items-center gap-1.5 uppercase tracking-wide text-[var(--muted)]">
              <Sparkles size={14} className="text-[var(--accent)]" /> Claims ({activeClaimsCount})
            </h3>
          </div>
          <div className="space-y-2">
            {entry.claims.map((claim) => (
              <div key={claim.id} className="panel panel-pad text-xs space-y-2 bg-[var(--panel)] border-[var(--border)] hover:border-[var(--accent)]/50 transition">
                <p className="leading-relaxed text-[var(--text)]">{claim.text}</p>
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  {claim.ticker && (
                    <Link href={`/tickers/${claim.ticker}`} className="text-[var(--accent)] font-mono font-bold hover:underline">
                      ${claim.ticker}
                    </Link>
                  )}
                  {claim.themeSlug && (
                    <span className="text-[var(--muted)] font-mono">{claim.themeSlug}</span>
                  )}
                  {claim.confidence && (
                    <span className="text-[var(--muted)] bg-[var(--soft)] px-1 rounded">{claim.confidence}% conf.</span>
                  )}
                  {claim.importance && (
                    <span className={`px-1 rounded ${claim.importance === "HIGH" ? "bg-[var(--bad)]/10 text-[var(--bad)]" : claim.importance === "MEDIUM" ? "bg-[var(--warn)]/10 text-[var(--warn)]" : "bg-[var(--good)]/10 text-[var(--good)]"}`}>
                      {claim.importance}
                    </span>
                  )}
                  {claim.sourceUrl && (
                    <a href={claim.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline font-mono">
                      [cite]
                    </a>
                  )}
                </div>
              </div>
            ))}
            {activeClaimsCount === 0 && (
              <div className="text-xs text-[var(--muted)] italic p-3 text-center border border-dashed border-[var(--border)] rounded">
                No parsed claims found.
              </div>
            )}
          </div>
        </div>

        {/* Risks Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="font-bold text-sm flex items-center gap-1.5 uppercase tracking-wide text-[var(--muted)]">
              <ShieldAlert size={14} className="text-[var(--bad)]" /> Risks ({activeRisksCount})
            </h3>
          </div>
          <div className="space-y-2">
            {entry.risks.map((risk) => (
              <div key={risk.id} className="panel panel-pad text-xs space-y-2 bg-[var(--panel)] border-[var(--border)] hover:border-[var(--bad)]/50 transition">
                <p className="leading-relaxed text-[var(--text)]">{risk.text}</p>
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  {risk.ticker && (
                    <Link href={`/tickers/${risk.ticker}`} className="text-[var(--accent)] font-mono font-bold hover:underline">
                      ${risk.ticker}
                    </Link>
                  )}
                  {risk.themeSlug && (
                    <span className="text-[var(--muted)] font-mono">{risk.themeSlug}</span>
                  )}
                  {risk.severity && (
                    <span className={`px-1 rounded ${risk.severity === "HIGH" ? "bg-[var(--bad)]/10 text-[var(--bad)] font-semibold" : risk.severity === "MEDIUM" ? "bg-[var(--warn)]/10 text-[var(--warn)]" : "bg-[var(--good)]/10 text-[var(--good)]"}`}>
                      {risk.severity} severity
                    </span>
                  )}
                  {risk.timeframe && (
                    <span className="text-[var(--muted)] bg-[var(--soft)] px-1 rounded">{risk.timeframe}</span>
                  )}
                  {risk.sourceUrl && (
                    <a href={risk.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline font-mono">
                      [cite]
                    </a>
                  )}
                </div>
              </div>
            ))}
            {activeRisksCount === 0 && (
              <div className="text-xs text-[var(--muted)] italic p-3 text-center border border-dashed border-[var(--border)] rounded">
                No parsed risks found.
              </div>
            )}
          </div>
        </div>

        {/* Catalysts Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="font-bold text-sm flex items-center gap-1.5 uppercase tracking-wide text-[var(--muted)]">
              <Target size={14} className="text-[var(--good)]" /> Catalysts ({activeCatalystsCount})
            </h3>
          </div>
          <div className="space-y-2">
            {entry.catalysts.map((cat) => (
              <div key={cat.id} className="panel panel-pad text-xs space-y-2 bg-[var(--panel)] border-[var(--border)] hover:border-[var(--good)]/50 transition">
                <p className="leading-relaxed text-[var(--text)]">{cat.text}</p>
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  {cat.ticker && (
                    <Link href={`/tickers/${cat.ticker}`} className="text-[var(--accent)] font-mono font-bold hover:underline">
                      ${cat.ticker}
                    </Link>
                  )}
                  {cat.themeSlug && (
                    <span className="text-[var(--muted)] font-mono">{cat.themeSlug}</span>
                  )}
                  {cat.importance && (
                    <span className={`px-1 rounded ${cat.importance === "HIGH" ? "bg-[var(--bad)]/10 text-[var(--bad)]" : cat.importance === "MEDIUM" ? "bg-[var(--warn)]/10 text-[var(--warn)]" : "bg-[var(--good)]/10 text-[var(--good)]"}`}>
                      {cat.importance} importance
                    </span>
                  )}
                  {cat.timeframe && (
                    <span className="text-[var(--muted)] bg-[var(--soft)] px-1 rounded">{cat.timeframe}</span>
                  )}
                  {cat.sourceUrl && (
                    <a href={cat.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline font-mono">
                      [cite]
                    </a>
                  )}
                </div>
              </div>
            ))}
            {activeCatalystsCount === 0 && (
              <div className="text-xs text-[var(--muted)] italic p-3 text-center border border-dashed border-[var(--border)] rounded">
                No parsed catalysts found.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TICKER MENTIONS & ANALYST TARGETS */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Ticker Mentions Grid */}
        <div className="panel panel-pad space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1">
            <Activity size={14} className="text-[var(--accent)]" /> Ticker Mentions ({entry.tickerMentions.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {entry.tickerMentions.map((tm) => {
              const sColors: Record<string, string> = {
                BULLISH: "text-[var(--good)] bg-[var(--good)]/5 border-[var(--good)]/20",
                BEARISH: "text-[var(--bad)] bg-[var(--bad)]/5 border-[var(--bad)]/20",
                NEUTRAL: "text-[var(--muted)] bg-[var(--soft)] border-[var(--border)]",
                MIXED: "text-[var(--warn)] bg-[var(--warn)]/5 border-[var(--warn)]/20",
              };
              return (
                <div key={tm.id} className="p-2.5 rounded border border-[var(--border)] bg-[var(--bg)] flex flex-col justify-between gap-1 hover:border-[var(--accent)] transition">
                  <div className="flex items-center justify-between">
                    <Link href={`/tickers/${tm.ticker}`} className="font-mono font-bold text-sm text-[var(--accent)] hover:underline">
                      ${tm.ticker}
                    </Link>
                    {tm.sentiment && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sColors[tm.sentiment] || ""}`}>
                        {tm.sentiment}
                      </span>
                    )}
                  </div>
                  {tm.role && <p className="text-[10px] text-[var(--muted)] line-clamp-1">{tm.role}</p>}
                  <div className="flex items-center justify-between text-[9px] text-[var(--muted)] mt-1">
                    <span>{tm.themeSlug || "No theme"}</span>
                    {tm.confidence && <span>{tm.confidence}% conf.</span>}
                  </div>
                </div>
              );
            })}
            {entry.tickerMentions.length === 0 && (
              <div className="text-xs text-[var(--muted)] italic p-4 text-center sm:col-span-2">
                No ticker mentions parsed.
              </div>
            )}
          </div>
        </div>

        {/* Analyst Targets List */}
        <div className="panel panel-pad space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1">
            <Target size={14} className="text-[var(--good)]" /> Analyst Price Targets ({entry.analystTargets.length})
          </h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {entry.analystTargets.map((at) => (
              <div key={at.id} className="p-2.5 rounded border border-[var(--border)] bg-[var(--bg)] text-xs flex flex-wrap items-center justify-between gap-2 hover:border-[var(--accent)] transition">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/tickers/${at.ticker}`} className="font-mono font-bold text-[var(--accent)] hover:underline">
                      ${at.ticker}
                    </Link>
                    <span className="font-semibold text-[var(--text)]">{at.firm || "Unknown Firm"}</span>
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">
                    Rating: <span className="font-medium text-[var(--text)]">{at.rating || "—"}</span> {at.date && `· ${new Date(at.date).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="text-right">
                  {at.target && (
                    <div className="font-mono font-bold text-[var(--text)]">
                      {at.previousTarget ? (
                        <span className="text-[10px] text-[var(--muted)] font-normal line-through mr-1">${at.previousTarget}</span>
                      ) : null}
                      <span className={at.previousTarget && at.target > at.previousTarget ? "text-[var(--good)] font-bold" : at.previousTarget && at.target < at.previousTarget ? "text-[var(--bad)] font-bold" : ""}>
                        ${at.target}
                      </span>
                    </div>
                  )}
                  {at.sourceUrl && (
                    <a href={at.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--accent)] hover:underline block">
                      Source Link
                    </a>
                  )}
                </div>
              </div>
            ))}
            {entry.analystTargets.length === 0 && (
              <div className="text-xs text-[var(--muted)] italic p-6 text-center">
                No analyst targets parsed.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* QUESTIONS & WATCH ITEMS */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Open Questions */}
        <div className="panel panel-pad space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1">
            <HelpCircle size={14} className="text-[var(--warn)]" /> Open Questions ({entry.questions.length})
          </h3>
          <div className="space-y-2">
            {entry.questions.map((q) => (
              <div key={q.id} className="p-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs flex items-start gap-2 hover:border-[var(--accent)] transition">
                <span className="text-[var(--warn)] font-bold">?</span>
                <div className="space-y-1">
                  <p className="font-medium leading-relaxed">{q.text}</p>
                  <div className="flex gap-2 text-[9px] text-[var(--muted)] font-mono">
                    {q.ticker && <span>ticker: ${q.ticker}</span>}
                    {q.themeSlug && <span>theme: {q.themeSlug}</span>}
                  </div>
                </div>
              </div>
            ))}
            {entry.questions.length === 0 && (
              <div className="text-xs text-[var(--muted)] italic p-4 text-center">
                No questions parsed.
              </div>
            )}
          </div>
        </div>

        {/* Watch Items */}
        <div className="panel panel-pad space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--muted)] border-b border-[var(--border)] pb-2 flex items-center gap-1">
            <Clock size={14} className="text-[var(--accent)]" /> Watch Items / Timeframes ({entry.watchItems.length})
          </h3>
          <div className="space-y-2">
            {entry.watchItems.map((wi) => (
              <div key={wi.id} className="p-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs flex items-start gap-2 hover:border-[var(--accent)] transition">
                <span className="text-[var(--accent)] font-semibold">⏰</span>
                <div className="space-y-1">
                  <p className="font-medium leading-relaxed">{wi.text}</p>
                  <div className="flex flex-wrap gap-2 text-[9px] text-[var(--muted)] font-mono">
                    {wi.ticker && <span>ticker: ${wi.ticker}</span>}
                    {wi.themeSlug && <span>theme: {wi.themeSlug}</span>}
                    {wi.timeframe && <span className="bg-[var(--soft)] px-1 rounded">timeframe: {wi.timeframe}</span>}
                  </div>
                </div>
              </div>
            ))}
            {entry.watchItems.length === 0 && (
              <div className="text-xs text-[var(--muted)] italic p-4 text-center">
                No watch items parsed.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TELEMETRY & RAW AI OUTPUT */}
      <section className="panel panel-pad space-y-3 border-dashed">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)] flex items-center gap-1">
          <FileText size={14} /> Telemetry & Raw AI Output
        </h3>
        
        {entry.parseError && (
          <div className="p-3 bg-[var(--bad)]/15 border border-[var(--bad)]/30 rounded text-xs text-[var(--bad)] font-semibold flex items-center gap-2">
            <AlertTriangle size={15} /> Warning: {entry.parseError}
          </div>
        )}

        {entry.ignoredLines.length > 0 && (
          <details className="group border border-[var(--bad)]/30 rounded-md bg-[var(--bad)]/5 overflow-hidden">
            <summary className="p-3 font-semibold text-xs text-[var(--bad)] select-none cursor-pointer hover:bg-[var(--bad)]/10 flex items-center justify-between transition">
              <span className="flex items-center gap-2">
                <AlertTriangle size={13} />
                <span>{entry.ignoredLines.length} ignored line{entry.ignoredLines.length === 1 ? "" : "s"} — click to inspect</span>
                <span className="badge text-[10px] bg-[var(--bad)]/10 text-[var(--bad)] border-[var(--bad)]/30">{entry.ignoredLines.length}</span>
              </span>
              <span className="text-[var(--bad)]/60 group-open:rotate-180 transition-transform duration-200">▼</span>
            </summary>
            <div className="border-t border-[var(--bad)]/20 p-3 space-y-1">
              {entry.ignoredLines.map((line, i) => (
                <pre
                  key={i}
                  className="text-[11px] font-mono text-[var(--bad)] bg-[var(--bad)]/10 border border-[var(--bad)]/20 rounded px-2 py-1 whitespace-pre-wrap break-all"
                >
                  {line}
                </pre>
              ))}
            </div>
          </details>
        )}

        <details className="group border border-[var(--border)] rounded-md bg-[var(--bg)] overflow-hidden">
          <summary className="p-3 font-semibold text-xs text-[var(--text)] select-none cursor-pointer hover:bg-[var(--soft)] flex items-center justify-between transition">
            <span>Click to expand raw output & parse logs ({entry.rawOutput.length} characters)</span>
            <span className="text-[var(--muted)] group-open:rotate-180 transition-transform duration-200">▼</span>
          </summary>
          <div className="p-3 border-t border-[var(--border)] space-y-3 bg-[var(--panel)]">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">Input details</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[var(--muted)]">
                <div>Entry ID: <span className="text-[var(--text)]">{entry.id}</span></div>
                <div>Run ID: <span className="text-[var(--text)]">{entry.runId || "Manual Upload"}</span></div>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">Raw Text Body</span>
              <pre className="p-3 rounded text-[11px] leading-relaxed overflow-x-auto bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] mono whitespace-pre-wrap max-h-[450px]">
                {entry.rawOutput}
              </pre>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
