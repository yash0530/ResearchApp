"use client";

import { useState, useTransition } from "react";
import { Check, EyeOff, X } from "lucide-react";
import { reviewDiscoveryAction } from "@/app/actions";
import { parseJsonArray } from "@/lib/json";

type CandidateRow = {
  symbol: string;
  companyName: string | null;
  suggestedThemes: string;
  sourceLine: string | null;
  status: string;
  occurrences: number;
  lastSeenAt: string;
};

type ThemeRow = {
  slug: string;
  name: string;
};

export function DiscoveriesClient({ candidates, themes }: { candidates: CandidateRow[]; themes: ThemeRow[] }) {
  const [filter, setFilter] = useState("NEW");
  const visible = filter === "ALL" ? candidates : candidates.filter((candidate) => candidate.status === filter);

  return (
    <div>
      <div className="panel panel-pad mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Review Queue</h2>
          <p className="text-sm text-[var(--muted)]">Unknown tickers parsed from research outputs appear here before entering the universe.</p>
        </div>
        <select className="select w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["NEW", "ACCEPTED", "REJECTED", "IGNORED", "ALL"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {visible.map((candidate) => (
          <CandidateCard key={candidate.symbol} candidate={candidate} themes={themes} />
        ))}
        {!visible.length && <div className="panel panel-pad text-sm text-[var(--muted)]">No discovery candidates in this filter.</div>}
      </div>
    </div>
  );
}

function CandidateCard({ candidate, themes }: { candidate: CandidateRow; themes: ThemeRow[] }) {
  const suggested = parseJsonArray<string>(candidate.suggestedThemes);
  const [themeSlug, setThemeSlug] = useState(suggested[0] || themes[0]?.slug || "");
  const [isPending, startTransition] = useTransition();

  function review(status: "ACCEPTED" | "REJECTED" | "IGNORED") {
    startTransition(() => reviewDiscoveryAction(candidate.symbol, status as never, themeSlug));
  }

  return (
    <article className="panel panel-pad">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-xl font-semibold">{candidate.symbol}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {candidate.companyName || "Unknown company"} · {candidate.occurrences} occurrence(s) · {candidate.status} · {candidate.lastSeenAt}
          </p>
          {candidate.sourceLine && <p className="mt-3 rounded-md bg-[var(--soft)] p-3 text-sm">{candidate.sourceLine}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="select w-auto" value={themeSlug} onChange={(e) => setThemeSlug(e.target.value)}>
            {themes.map((theme) => (
              <option key={theme.slug} value={theme.slug}>
                {theme.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" disabled={isPending} onClick={() => review("ACCEPTED")}>
            <Check size={15} /> Accept
          </button>
          <button className="btn" disabled={isPending} onClick={() => review("IGNORED")}>
            <EyeOff size={15} /> Ignore
          </button>
          <button className="btn btn-danger" disabled={isPending} onClick={() => review("REJECTED")}>
            <X size={15} /> Reject
          </button>
        </div>
      </div>
    </article>
  );
}
