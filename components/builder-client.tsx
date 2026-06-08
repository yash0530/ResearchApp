"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { createRenderedRunAction, markRunLaunchedAction, saveResearchOutputAction, refreshTickerDataAction } from "@/app/actions";
import { FINANCIAL_WINDOWS, HORIZONS, LOOKBACKS, SOURCE_APP_LABELS, SOURCE_APPS, prettifyEnum } from "@/lib/enums";
import { parseResearchOutput } from "@/lib/parser";
import { Markdown } from "@/components/markdown";
import type { LaunchPlan } from "@/lib/launch";
import { lookbackToRange } from "@/lib/prompt-renderer";
import { DEFAULT_PORTFOLIO_CONTEXT } from "@/lib/portfolio";

const MAX_TICKERS = 12;

type PromptOption = {
  id: string;
  title: string;
  description: string;
  body: string;
  cadence: string;
  isFavorite: boolean;
};

type ThemeOption = {
  slug: string;
  name: string;
  color: string;
  tickers: string[];
};

type TickerOption = {
  symbol: string;
  companyName: string | null;
  dataStatus: string;
  themeSlugs: string[];
};

type RenderedRun = {
  runId: string;
  renderedPrompt: string;
  launchPlan: LaunchPlan;
  signature: string;
};

export function BuilderClient({
  prompts,
  themes,
  tickers,
  initialPromptTemplateId,
}: {
  prompts: PromptOption[];
  themes: ThemeOption[];
  tickers: TickerOption[];
  initialPromptTemplateId?: string;
}) {
  const favorite = prompts.find((prompt) => prompt.isFavorite) ?? prompts[0];
  const initialPrompt =
    prompts.find((prompt) => prompt.id === initialPromptTemplateId) ?? favorite;
  const defaultThemes = themes.some((theme) => theme.slug === "memory_storage")
    ? ["memory_storage"]
    : themes[0]
      ? [themes[0].slug]
      : [];
  const defaultTickers = ["MU", "SNDK"].filter((ticker) => tickers.some((t) => t.symbol === ticker));

  const [sourceApp, setSourceApp] = useState("PERPLEXITY");
  const [promptTemplateId, setPromptTemplateId] = useState(initialPrompt?.id ?? "");
  const [themeSlugs, setThemeSlugs] = useState<string[]>(defaultThemes);
  const [selectedTickers, setSelectedTickers] = useState<string[]>(defaultTickers);
  const [lookback, setLookback] = useState("30d");
  const [financialWindow, setFinancialWindow] = useState("last_6_quarters");
  const [horizon, setHorizon] = useState("next_12_months");
  const researchType = "dashboard";
  const [tickerQuery, setTickerQuery] = useState("");
  const [rendered, setRendered] = useState<RenderedRun | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Step tracker state
  const [launched, setLaunched] = useState(false);

  // Capture box state
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureOutput, setCaptureOutput] = useState("");
  const [captureSummary, setCaptureSummary] = useState("");
  const [captureNotes, setCaptureNotes] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [saveResult, setSaveResult] = useState<{ entryId: string; parseStatus: string; ignoredCount: number } | null>(null);
  const [saveError, setSaveError] = useState("");
  const [ignoredExpanded, setIgnoredExpanded] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Refresh ticker state
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [refreshMessage, setRefreshMessage] = useState("");

  const selectedPrompt = prompts.find((prompt) => prompt.id === promptTemplateId);
  const selectedThemes = useMemo(
    () => themes.filter((theme) => themeSlugs.includes(theme.slug)),
    [themes, themeSlugs],
  );

  const visibleTickers = useMemo(() => {
    if (!themeSlugs.length) return tickers;
    return tickers.filter((ticker) => ticker.themeSlugs.some((slug) => themeSlugs.includes(slug)));
  }, [themeSlugs, tickers]);

  const searchedTickers = useMemo(() => {
    const q = tickerQuery.trim().toLowerCase();
    if (!q) return visibleTickers;
    return visibleTickers.filter(
      (t) => t.symbol.toLowerCase().includes(q) || (t.companyName ?? "").toLowerCase().includes(q),
    );
  }, [visibleTickers, tickerQuery]);

  const selectedTickerRows = useMemo(
    () => selectedTickers.map((symbol) => tickers.find((ticker) => ticker.symbol === symbol)).filter(Boolean) as TickerOption[],
    [selectedTickers, tickers],
  );

  const builderSignature = useMemo(
    () =>
      JSON.stringify({
        sourceApp,
        promptTemplateId,
        themeSlugs,
        selectedTickers,
        lookback,
        financialWindow,
        horizon,
        researchType,
      }),
    [sourceApp, promptTemplateId, themeSlugs, selectedTickers, lookback, financialWindow, horizon, researchType],
  );
  const activeRendered = rendered?.signature === builderSignature ? rendered : null;
  const hasStaleRun = Boolean(rendered && !activeRendered);

  const livePreview = useMemo(() => {
    if (!selectedPrompt) return "Choose a prompt template to preview the rendered prompt.";
    return renderLivePreview({
      body: selectedPrompt.body,
      themes: selectedThemes,
      tickers: selectedTickerRows,
      values: {
        lookback,
        financialWindow,
        horizon,
        researchType,
      },
    });
  }, [financialWindow, horizon, lookback, researchType, selectedPrompt, selectedThemes, selectedTickerRows]);

  // Live parse preview — computed on every keystroke, no debounce needed for pure fn
  const liveParsed = useMemo(() => {
    if (!captureOutput.trim()) return null;
    return parseResearchOutput(captureOutput);
  }, [captureOutput]);

  function toggleTheme(slug: string) {
    setThemeSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  function toggleTicker(symbol: string) {
    setSelectedTickers((current) => {
      if (current.includes(symbol)) return current.filter((item) => item !== symbol);
      if (current.length >= MAX_TICKERS) return current;
      return [...current, symbol].sort();
    });
  }

  function selectVisibleTickers() {
    setSelectedTickers(visibleTickers.map((ticker) => ticker.symbol).slice(0, MAX_TICKERS));
  }

  function clearTickers() {
    setSelectedTickers([]);
  }

  function renderRun() {
    setMessage("");
    // Reset launch/capture state when a new run is created
    setLaunched(false);
    setSaveResult(null);
    setSaveError("");
    startTransition(async () => {
      try {
        const result = await createRenderedRunAction({
          sourceApp,
          promptTemplateId,
          themeSlugs,
          tickers: selectedTickers,
          lookback,
          financialWindow,
          horizon,
          researchType,
        });
        setRendered({ ...result, signature: builderSignature });
        setMessage("Run created with refreshed local context.");
        // Pre-fill title with prompt title + today's date
        const today = new Date().toISOString().slice(0, 10);
        const promptTitle = prompts.find((p) => p.id === promptTemplateId)?.title ?? "Research";
        setCaptureTitle(`${promptTitle} — ${today}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not create run.");
      }
    });
  }

  async function copyAndOpen() {
    if (!activeRendered) return;
    const { url, mode } = activeRendered.launchPlan;

    // Clipboard is the critical step — handle its failure on its own.
    try {
      await navigator.clipboard.writeText(activeRendered.renderedPrompt);
    } catch {
      toast.error("Couldn't access the clipboard. Select the rendered prompt text and copy it manually, then open your tool.");
      return;
    }

    const didLaunch = Boolean(url);
    if (url) {
      if (url.startsWith("claude://")) {
        window.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
    setLaunched(true);
    setSaveResult(null);
    setSaveError("");
    toast.success(mode === "copy_only" ? "Prompt copied to clipboard." : `Prompt copied — opening ${appLabel}.`);

    // Persist run state in the background; a DB hiccup shouldn't look like a clipboard error.
    markRunLaunchedAction(activeRendered.runId, didLaunch).catch(() => {});
  }

  function saveOutput() {
    if (!captureTitle.trim() || !captureOutput.trim()) return;
    setSaveError("");
    setSaveResult(null);
    startSaveTransition(async () => {
      try {
        const result = await saveResearchOutputAction({
          runId: activeRendered?.runId,
          title: captureTitle,
          rawOutput: captureOutput,
          summary: captureSummary || undefined,
          notes: captureNotes || undefined,
          sourceApp: sourceApp as Parameters<typeof saveResearchOutputAction>[0]["sourceApp"],
        });
        setSaveResult(result);
        toast.success(result.parseStatus === "PARSED" ? "Saved & parsed." : "Saved — no json data block found.");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Could not save output.";
        setSaveError(msg);
        toast.error(msg);
      }
    });
  }

  function refreshTickerData() {
    if (!selectedTickers.length) return;
    setRefreshMessage("");
    startRefreshTransition(async () => {
      try {
        await refreshTickerDataAction(selectedTickers);
        setRefreshMessage("Market data refreshed.");
      } catch (error) {
        setRefreshMessage(error instanceof Error ? error.message : "Refresh failed.");
      }
    });
  }

  // Step tracker helpers
  const step1Done = Boolean(activeRendered);
  const step2Done = launched;
  const appLabel = SOURCE_APP_LABELS[sourceApp as keyof typeof SOURCE_APP_LABELS] ?? sourceApp;

  // Guidance text after copy
  const guidanceText = useMemo(() => {
    if (!activeRendered || !launched) return null;
    const mode = activeRendered.launchPlan.mode;
    if (mode === "open_and_copy") {
      return `Prompt is on your clipboard — paste it into ${appLabel}, run it, then copy the full answer (including the json block at the end) back here.`;
    }
    if (mode === "prefill_url") {
      return `Prompt was pre-filled in ${appLabel} — run it, then copy the full answer back here.`;
    }
    return "Prompt copied — run it wherever you like, then paste the answer back.";
  }, [activeRendered, launched, appLabel]);

  return (
    <div className="grid gap-4 xl:grid-cols-[460px_1fr]">
      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--soft)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Run Builder</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Tune the contract, scope, and investable universe.
              </p>
            </div>
            <span className="badge">{selectedTickers.length}/{MAX_TICKERS} tickers</span>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Field label="Source app">
              <select className="select" value={sourceApp} onChange={(e) => setSourceApp(e.target.value)}>
                {SOURCE_APPS.map((app) => (
                  <option key={app} value={app}>
                    {SOURCE_APP_LABELS[app]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prompt template">
              <select className="select" value={promptTemplateId} onChange={(e) => setPromptTemplateId(e.target.value)}>
                {prompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.isFavorite ? "★ " : ""}
                    {prompt.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedPrompt && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                {selectedPrompt.isFavorite && <span className="badge">Favorite</span>}
                <span className="badge">{prettifyEnum(selectedPrompt.cadence)}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{selectedPrompt.description}</p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="label mb-0">Themes</span>
              <span className="text-xs text-[var(--muted)]">{themeSlugs.length || "All"} active</span>
            </div>
            <div className="grid max-h-48 gap-1 overflow-y-auto pr-1">
              {themes.map((theme) => {
                const checked = themeSlugs.includes(theme.slug);
                return (
                  <label
                    key={theme.slug}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 transition ${
                      checked ? "border-[var(--text)] bg-[var(--soft)]" : "border-[var(--border)] bg-[var(--bg)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleTheme(theme.slug)}
                    />
                    <CheckboxMark checked={checked} />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: theme.color }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{theme.name}</span>
                    <span className="badge px-1.5 py-0 text-[0.68rem]">{theme.tickers.length}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="label mb-0">Tickers</span>
              <div className="flex gap-2">
                <button className="btn px-2 py-1 text-xs" type="button" onClick={selectVisibleTickers}>
                  Select visible
                </button>
                <button className="btn px-2 py-1 text-xs" type="button" onClick={clearTickers}>
                  Clear
                </button>
                <button
                  className="btn px-2 py-1 text-xs"
                  type="button"
                  disabled={isRefreshing || !selectedTickers.length}
                  onClick={refreshTickerData}
                  title="Re-fetch grounded market data for selected tickers"
                >
                  <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
                  {isRefreshing ? "Refreshing…" : "Refresh data"}
                </button>
              </div>
            </div>

            {refreshMessage && (
              <div className="mb-2 rounded-md border border-[var(--border)] bg-[var(--soft)] px-3 py-2 text-xs text-[var(--muted)]">
                {refreshMessage}
              </div>
            )}

            <input
              className="input mb-2"
              placeholder="Search tickers…"
              value={tickerQuery}
              onChange={(e) => setTickerQuery(e.target.value)}
            />

            <div className="max-h-72 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg)] p-1">
              <div className="grid gap-1">
                {searchedTickers.map((ticker) => {
                  const checked = selectedTickers.includes(ticker.symbol);
                  const disabled = !checked && selectedTickers.length >= MAX_TICKERS;
                  return (
                    <label
                      key={ticker.symbol}
                      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition ${
                        checked ? "bg-[var(--soft)]" : "hover:bg-[var(--soft)]"
                      } ${disabled ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleTicker(ticker.symbol)}
                      />
                      <CheckboxMark checked={checked} disabled={disabled} />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-mono text-sm font-semibold">{ticker.symbol}</span>
                        {ticker.companyName && <span className="text-sm text-[var(--muted)]"> · {ticker.companyName}</span>}
                        {ticker.dataStatus === "UNVERIFIED" && <span className="text-xs text-[var(--bad)]"> · unverified</span>}
                      </span>
                    </label>
                  );
                })}
                {!searchedTickers.length && (
                  <div className="p-3 text-sm text-[var(--muted)]">No tickers match the selected themes.</div>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTickers.map((ticker) => (
                <button
                  key={ticker}
                  type="button"
                  className="badge hover:border-[var(--text)] hover:text-[var(--text)]"
                  onClick={() => toggleTicker(ticker)}
                  title="Remove ticker"
                >
                  {ticker}
                </button>
              ))}
              {!selectedTickers.length && <span className="text-sm text-[var(--muted)]">Pick one or more tickers for the prompt.</span>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <Field label="Lookback">
              <select className="select" value={lookback} onChange={(e) => setLookback(e.target.value)}>
                {LOOKBACKS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Financial window">
              <select className="select" value={financialWindow} onChange={(e) => setFinancialWindow(e.target.value)}>
                {FINANCIAL_WINDOWS.map((value) => (
                  <option key={value} value={value}>
                    {prettifyEnum(value)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Horizon">
              <select className="select" value={horizon} onChange={(e) => setHorizon(e.target.value)}>
                {HORIZONS.map((value) => (
                  <option key={value} value={value}>
                    {prettifyEnum(value)}
                  </option>
                ))}
              </select>
            </Field>
          </div>


          <button className="btn btn-primary w-full" onClick={renderRun} disabled={isPending || !promptTemplateId}>
            <RefreshCw size={16} />
            {isPending ? "Creating run..." : "Create run + refresh context"}
          </button>

          {message && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--soft)] p-3 text-sm">
              <div>{message}</div>
              {hasStaleRun && <div className="mt-1 text-[var(--muted)]">Builder changed since that run. Create a fresh run before launching.</div>}
            </div>
          )}
        </div>
      </section>

      <section className="panel panel-pad flex flex-col gap-5" style={{ minHeight: "calc(100vh - 260px)" }}>
        {/* Header + launch button */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Live Prompt Preview</h2>
              <span className="badge">{activeRendered ? "Run ready" : "Live draft"}</span>
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Updates as you change the builder. Create a run to refresh market context and enable launch.
            </p>
          </div>
          <button className="btn btn-primary" disabled={!activeRendered} onClick={copyAndOpen}>
            {activeRendered?.launchPlan.mode === "copy_only" ? <Copy size={16} /> : <ExternalLink size={16} />}
            {activeRendered?.launchPlan.label || "Create run first"}
          </button>
        </div>

        {/* Step tracker */}
        <StepTracker step1Done={step1Done} step2Done={step2Done} appLabel={appLabel} />

        {/* Guidance text */}
        {guidanceText && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--soft)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            {guidanceText}
          </div>
        )}

        {/* Prompt preview textarea */}
        <textarea
          className="textarea flex-1 text-sm leading-7"
          style={{ minHeight: "200px" }}
          value={activeRendered?.renderedPrompt || livePreview}
          readOnly
        />
        <p className="text-xs text-[var(--muted)]">Live draft — market context, the current date, and source-app notes are finalized when you Create run.</p>

        {/* Capture box — visible once a run exists (always shown but disabled until run ready) */}
        <div className={`space-y-4 rounded-md border border-[var(--border)] p-4 ${!activeRendered ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Paste output</h3>
            {!activeRendered && <span className="text-xs text-[var(--muted)]">Create a run first</span>}
          </div>

          <Field label="Title">
            <input
              className="input"
              value={captureTitle}
              onChange={(e) => setCaptureTitle(e.target.value)}
              disabled={!activeRendered}
              placeholder="e.g. Memory storage dashboard — 2026-05-31"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="label mb-0">Answer from {appLabel}</span>
              {captureOutput.trim() && (
                <button
                  type="button"
                  onClick={() => setIsPreviewMode((v) => !v)}
                  className="btn px-2 py-1 text-xs"
                >
                  {isPreviewMode ? "Edit Raw" : "Preview Report"}
                </button>
              )}
            </div>
            {isPreviewMode ? (
              <div className="textarea text-sm leading-7 overflow-y-auto bg-[var(--bg)] border border-[var(--border)] p-3 rounded-md" style={{ minHeight: "180px", maxHeight: "400px" }}>
                <Markdown>{captureOutput}</Markdown>
              </div>
            ) : (
              <textarea
                className="textarea text-sm leading-7"
                style={{ minHeight: "180px" }}
                value={captureOutput}
                onChange={(e) => setCaptureOutput(e.target.value)}
                disabled={!activeRendered}
                placeholder={`Paste the full answer from ${appLabel} here, including the fenced json block.`}
              />
            )}
          </div>

          {/* Live parse tally */}
          {liveParsed && (
            <ParseTally parsed={liveParsed} expanded={ignoredExpanded} onToggleExpanded={() => setIgnoredExpanded((v) => !v)} />
          )}

          <Field label="Summary (optional)">
            <input
              className="input"
              value={captureSummary}
              onChange={(e) => setCaptureSummary(e.target.value)}
              disabled={!activeRendered}
              placeholder="One-line takeaway"
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              className="textarea text-sm"
              style={{ minHeight: "72px" }}
              value={captureNotes}
              onChange={(e) => setCaptureNotes(e.target.value)}
              disabled={!activeRendered}
              placeholder="Follow-up actions, caveats, etc."
            />
          </Field>

          <button
            className="btn btn-primary w-full"
            onClick={saveOutput}
            disabled={isSaving || !activeRendered || !captureTitle.trim() || !captureOutput.trim()}
          >
            <Save size={16} />
            {isSaving ? "Saving…" : "Save & parse"}
          </button>

          {saveError && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--soft)] p-3 text-sm text-[var(--bad)]">
              {saveError}
            </div>
          )}

          {saveResult && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--soft)] p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Check size={14} className="text-[var(--good,#16a34a)]" />
                <span>
                  Saved.{" "}
                  <Link href={`/research/${saveResult.entryId}`} className="underline underline-offset-2">
                    View entry
                  </Link>
                </span>
                <span className="badge">{saveResult.parseStatus === "PARSED" ? "Parsed" : "No block"}</span>
                {saveResult.ignoredCount > 0 && (
                  <span className="badge text-[var(--bad)]">{saveResult.ignoredCount} ignored line{saveResult.ignoredCount !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Step tracker ────────────────────────────────────────────────────────────

function StepTracker({ step1Done, step2Done, appLabel }: { step1Done: boolean; step2Done: boolean; appLabel: string }) {
  const steps = [
    { label: "Create run", done: step1Done, active: !step1Done },
    { label: `Copy & open ${appLabel}`, done: step2Done, active: step1Done && !step2Done },
    { label: `Run it in ${appLabel}`, done: false, active: step2Done },
    { label: "Paste the answer back", done: false, active: step2Done },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs">
      {steps.map((step, i) => (
        <li key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[var(--muted)]">→</span>}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition ${
              step.done
                ? "bg-[var(--accent)] text-[var(--bg)]"
                : step.active
                  ? "border border-[var(--accent)] text-[var(--accent)]"
                  : "border border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {step.done && <Check size={10} strokeWidth={3} />}
            {i + 1}. {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ─── Live parse tally ────────────────────────────────────────────────────────

function ParseTally({
  parsed,
  expanded,
  onToggleExpanded,
}: {
  parsed: ReturnType<typeof parseResearchOutput>;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const { claims, risks, catalysts, tickerMentions, analystTargets, themeSignals, watchItems, verdicts, discoveries, questions, lineCount, ignoredLines } = parsed;

  if (lineCount === 0) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--muted)]">
        No json data block detected yet.
      </div>
    );
  }

  const parts: string[] = [];
  if (claims.length) parts.push(`${claims.length} claim${claims.length !== 1 ? "s" : ""}`);
  if (risks.length) parts.push(`${risks.length} risk${risks.length !== 1 ? "s" : ""}`);
  if (catalysts.length) parts.push(`${catalysts.length} catalyst${catalysts.length !== 1 ? "s" : ""}`);
  if (tickerMentions.length) parts.push(`${tickerMentions.length} ticker${tickerMentions.length !== 1 ? "s" : ""}`);
  if (analystTargets.length) parts.push(`${analystTargets.length} target${analystTargets.length !== 1 ? "s" : ""}`);
  if (themeSignals.length) parts.push(`${themeSignals.length} theme${themeSignals.length !== 1 ? "s" : ""}`);
  if (watchItems.length) parts.push(`${watchItems.length} watch${watchItems.length !== 1 ? "es" : ""}`);
  if (verdicts.length) parts.push(`${verdicts.length} verdict${verdicts.length !== 1 ? "s" : ""}`);
  if (discoveries.length) parts.push(`${discoveries.length} discover${discoveries.length !== 1 ? "ies" : "y"}`);
  if (questions.length) parts.push(`${questions.length} question${questions.length !== 1 ? "s" : ""}`);

  return (
    <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <Check size={12} className="shrink-0 text-[var(--good,#16a34a)]" />
        <span className="font-medium text-[var(--good,#16a34a)]">
          {parts.length ? parts.join(" · ") : `${lineCount} line${lineCount !== 1 ? "s" : ""} parsed`}
        </span>
      </div>

      {ignoredLines.length > 0 && (
        <div>
          <button
            type="button"
            className="flex items-center gap-1 text-[var(--bad)] hover:opacity-80"
            onClick={onToggleExpanded}
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {ignoredLines.length} malformed / ignored line{ignoredLines.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <ul className="mt-1.5 space-y-1 pl-3.5">
              {ignoredLines.map((line, i) => (
                <li key={i} className="truncate font-mono text-[0.7rem] text-[var(--muted)]" title={line}>
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function CheckboxMark({ checked, disabled = false }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
        checked
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
          : "border-[var(--border)] bg-[var(--panel)] text-transparent"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <Check size={12} strokeWidth={3} />
    </span>
  );
}

function renderLivePreview({
  body,
  themes,
  tickers,
  values,
}: {
  body: string;
  themes: ThemeOption[];
  tickers: TickerOption[];
  values: {
    lookback: string;
    financialWindow: string;
    horizon: string;
    researchType: string;
  };
}) {
  const themeText = themes.length
    ? themes.map((theme) => `${theme.slug} (${theme.name})`).join(", ")
    : "No themes selected";
  const tickerText = tickers.length ? tickers.map((ticker) => ticker.symbol).join(", ") : "No tickers selected";
  const localContext = buildPreviewContext(tickers);

  return body
    .replaceAll("{{themes}}", themeText)
    .replaceAll("{{tickers}}", tickerText)
    .replaceAll("{{lookback}}", lookbackToRange(values.lookback))
    .replaceAll("{{financial_window}}", values.financialWindow)
    .replaceAll("{{horizon}}", values.horizon)
    .replaceAll("{{local_context}}", localContext)
    .replaceAll("{{today}}", new Date().toISOString().slice(0, 10))
    .replaceAll("{{portfolio_context}}", DEFAULT_PORTFOLIO_CONTEXT)
    .replaceAll("{{research_type}}", values.researchType);
}

function buildPreviewContext(tickers: TickerOption[]) {
  if (!tickers.length) return "LOCAL_CONTEXT_EMPTY";
  return tickers
    .map((ticker) =>
      [
        "LOCAL_TICKER",
        `ticker=${ticker.symbol}`,
        `company=${cleanContextValue(ticker.companyName) || "na"}`,
        "data=refreshes_when_run_is_created",
      ].join("|"),
    )
    .join("\n");
}

function cleanContextValue(value?: string | null) {
  return value?.replace(/[|\n\r]/g, " ").trim();
}
