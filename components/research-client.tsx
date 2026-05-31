"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArchiveRestore, EyeOff, Trash2, RefreshCw } from "lucide-react";
import {
  restoreResearchAction,
  softDeleteResearchAction,
  updateResearchStatusAction,
  saveResearchOutputAction,
} from "@/app/actions";
import { RESEARCH_STATUSES, RESEARCH_STATUS_LABELS } from "@/lib/enums";

type EntryRow = {
  id: string;
  title: string;
  sourceApp: string;
  status: string;
  parseStatus: string;
  deletedAt: string | null;
  updatedAt: string;
  summary: string | null;
  rawPreview: string;
  rawOutput: string;
  runId: string | null;
  counts: {
    claims: number;
    risks: number;
    catalysts: number;
    targets: number;
    tickers: number;
    verdicts: number;
    questions: number;
  };
};

export function ResearchClient({ entries }: { entries: EntryRow[] }) {
  const [query, setQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return entries.filter((entry) => {
      if (!includeInactive && (entry.deletedAt || entry.status !== "ACTIVE")) return false;
      return !q || `${entry.title} ${entry.summary || ""} ${entry.rawPreview}`.toLowerCase().includes(q);
    });
  }, [entries, includeInactive, query]);

  return (
    <div>
      <div className="panel panel-pad mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input className="input md:max-w-md" placeholder="Search research..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          Include stale, incorrect, archived, deleted
        </label>
      </div>

      <div className="space-y-3">
        {filtered.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
        {!filtered.length && <div className="panel panel-pad text-sm text-[var(--muted)]">No research entries match this view.</div>}
      </div>
    </div>
  );
}

function EntryCard({ entry }: { entry: EntryRow }) {
  const [isPending, startTransition] = useTransition();
  const [reparseText, setReparseText] = useState<string | null>(null);

  function setStatus(status: string) {
    startTransition(() => updateResearchStatusAction(entry.id, status as never));
  }

  function softDelete() {
    if (!window.confirm("Soft-delete this research entry? It can be recovered from the inactive filter.")) return;
    startTransition(() => softDeleteResearchAction(entry.id));
  }

  function restore() {
    startTransition(() => {
      restoreResearchAction(entry.id);
    });
  }

  function handleReparse() {
    setReparseText("Parsing...");
    startTransition(async () => {
      try {
        await saveResearchOutputAction({
          runId: entry.runId || undefined,
          title: entry.title,
          rawOutput: entry.rawOutput,
          summary: entry.summary || undefined,
          sourceApp: entry.sourceApp as any,
        });
        setReparseText("Success");
        setTimeout(() => setReparseText(null), 2000);
      } catch (err) {
        setReparseText("Error");
        setTimeout(() => setReparseText(null), 3000);
      }
    });
  }

  return (
    <article className={`panel panel-pad bg-[var(--panel)] ${entry.deletedAt ? "opacity-60" : ""} hover:shadow transition`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/research/${entry.id}`}
            className="text-lg font-bold text-[var(--text)] hover:text-[var(--accent)] hover:underline transition"
          >
            {entry.title}
          </Link>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {entry.sourceApp} · {entry.status} · {entry.parseStatus} · {entry.updatedAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="select w-auto text-xs" value={entry.status} onChange={(e) => setStatus(e.target.value)} disabled={isPending}>
            {RESEARCH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RESEARCH_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleReparse}
            disabled={isPending}
            className="btn text-xs"
            title="Re-run the parsed block extraction from raw text"
          >
            <RefreshCw size={13} className={reparseText === "Parsing..." ? "animate-spin text-[var(--accent)]" : ""} />
            {reparseText || "Re-parse"}
          </button>

          {entry.deletedAt ? (
            <button className="btn text-xs" onClick={restore}>
              <ArchiveRestore size={13} /> Restore
            </button>
          ) : (
            <button className="btn btn-danger text-xs" onClick={softDelete}>
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">{entry.summary || entry.rawPreview}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="badge text-[10px]">{entry.counts.tickers} tickers</span>
        <span className="badge text-[10px]">{entry.counts.claims} claims</span>
        <span className="badge text-[10px]">{entry.counts.risks} risks</span>
        <span className="badge text-[10px]">{entry.counts.catalysts} catalysts</span>
        <span className="badge text-[10px]">{entry.counts.targets} targets</span>
        <span className="badge text-[10px]">{entry.counts.verdicts} verdicts</span>
        <span className="badge text-[10px]">{entry.counts.questions} questions</span>
        {entry.deletedAt && (
          <span className="badge text-[10px]">
            <EyeOff size={10} /> deleted
          </span>
        )}
      </div>
    </article>
  );
}
