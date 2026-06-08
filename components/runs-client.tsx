"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { saveResearchOutputAction } from "@/app/actions";
import { parseResearchOutput } from "@/lib/parser";

type RunRow = {
  id: string;
  sourceApp: string;
  status: string;
  createdAt: string;
  promptTitle: string;
  renderedPrompt: string;
  entry?: {
    id: string;
    title: string;
    summary: string | null;
    parseStatus: string;
  } | null;
};

export function RunsClient({ runs }: { runs: RunRow[] }) {
  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
      {!runs.length && (
        <div className="panel panel-pad text-sm text-[var(--muted)]">
          No runs yet. Create one from the <Link className="underline" href="/builder">builder</Link>.
        </div>
      )}
    </div>
  );
}

function RunCard({ run }: { run: RunRow }) {
  const [title, setTitle] = useState(run.entry?.title || run.promptTitle);
  const [summary, setSummary] = useState(run.entry?.summary || "");
  const [rawOutput, setRawOutput] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const liveParsed = rawOutput.trim() ? parseResearchOutput(rawOutput) : null;

  function save() {
    startTransition(async () => {
      const result = await saveResearchOutputAction({
        runId: run.id,
        title,
        summary,
        notes,
        rawOutput,
        sourceApp: run.sourceApp as never,
      });
      setMessage(`Saved ${result.parseStatus}${result.ignoredCount ? ` with ${result.ignoredCount} ignored line(s)` : ""}.`);
      setRawOutput("");
    });
  }

  return (
    <article className="panel panel-pad">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{run.promptTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {run.sourceApp} · {run.status} · {run.createdAt}
          </p>
        </div>
        <span className="badge">{run.entry ? run.entry.parseStatus : "Awaiting output"}</span>
      </div>

      <details className="mb-4 rounded-md border border-[var(--border)] p-3">
        <summary className="cursor-pointer text-sm font-medium">Rendered prompt</summary>
        <textarea className="textarea mt-3 min-h-72" readOnly value={run.renderedPrompt} />
      </details>

      {run.entry && !rawOutput ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--soft)] p-3 text-sm">
          Existing output saved as <strong>{run.entry.title}</strong>. Paste new output below to replace/re-parse it.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label>
          <span className="label">Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span className="label">Summary</span>
          <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
      </div>
      <div className="mt-3">
        <label>
          <span className="label">Pasted external output</span>
          <textarea
            className="textarea min-h-72"
            value={rawOutput}
            onChange={(e) => setRawOutput(e.target.value)}
            placeholder="Paste the full LLM answer here, including the fenced json block at the end."
          />
        </label>
        {liveParsed && (
          <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--muted)]">
            {liveParsed.lineCount === 0
              ? "No json data block detected yet."
              : `Parsed: ${liveParsed.tickerMentions.length} tickers · ${liveParsed.claims.length} claims · ${liveParsed.risks.length} risks · ${liveParsed.verdicts.length} verdicts · ${liveParsed.discoveries.length} discoveries${liveParsed.ignoredLines.length ? ` · ${liveParsed.ignoredLines.length} ignored` : ""}`}
          </div>
        )}
      </div>
      <div className="mt-3">
        <label>
          <span className="label">My notes</span>
          <textarea className="textarea min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={isPending || !rawOutput.trim()}>
          <Save size={15} /> {isPending ? "Saving..." : "Save output + parse"}
        </button>
        {message && <span className="text-sm text-[var(--muted)]">{message}</span>}
      </div>
    </article>
  );
}
