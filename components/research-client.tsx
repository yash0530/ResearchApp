"use client";

import { useMemo, useState, useTransition } from "react";
import { ArchiveRestore, EyeOff, Trash2 } from "lucide-react";
import { restoreResearchAction, softDeleteResearchAction, updateResearchStatusAction } from "@/app/actions";
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
  counts: {
    claims: number;
    risks: number;
    catalysts: number;
    targets: number;
    tickers: number;
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

  function setStatus(status: string) {
    startTransition(() => updateResearchStatusAction(entry.id, status as never));
  }

  function softDelete() {
    if (!window.confirm("Soft-delete this research entry? It can be recovered from the inactive filter.")) return;
    startTransition(() => softDeleteResearchAction(entry.id));
  }

  function restore() {
    startTransition(() => restoreResearchAction(entry.id));
  }

  return (
    <article className={`panel panel-pad ${entry.deletedAt ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{entry.title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {entry.sourceApp} · {entry.status} · {entry.parseStatus} · {entry.updatedAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="select w-auto" value={entry.status} onChange={(e) => setStatus(e.target.value)} disabled={isPending}>
            {RESEARCH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RESEARCH_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {entry.deletedAt ? (
            <button className="btn" onClick={restore}>
              <ArchiveRestore size={15} /> Restore
            </button>
          ) : (
            <button className="btn btn-danger" onClick={softDelete}>
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{entry.summary || entry.rawPreview}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="badge">{entry.counts.tickers} tickers</span>
        <span className="badge">{entry.counts.claims} claims</span>
        <span className="badge">{entry.counts.risks} risks</span>
        <span className="badge">{entry.counts.catalysts} catalysts</span>
        <span className="badge">{entry.counts.targets} targets</span>
        {entry.deletedAt && (
          <span className="badge">
            <EyeOff size={12} /> deleted
          </span>
        )}
      </div>
    </article>
  );
}
