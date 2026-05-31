"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { createRenderedRunAction, markRunLaunchedAction } from "@/app/actions";
import { FINANCIAL_WINDOWS, HORIZONS, LOOKBACKS, SOURCE_APP_LABELS, SOURCE_APPS, prettifyEnum } from "@/lib/enums";
import type { LaunchPlan } from "@/lib/launch";

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
  const [researchType, setResearchType] = useState("dashboard");
  const [rendered, setRendered] = useState<RenderedRun | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedPrompt = prompts.find((prompt) => prompt.id === promptTemplateId);
  const selectedThemes = useMemo(
    () => themes.filter((theme) => themeSlugs.includes(theme.slug)),
    [themes, themeSlugs],
  );

  const visibleTickers = useMemo(() => {
    if (!themeSlugs.length) return tickers;
    return tickers.filter((ticker) => ticker.themeSlugs.some((slug) => themeSlugs.includes(slug)));
  }, [themeSlugs, tickers]);

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
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not create run.");
      }
    });
  }

  async function copyAndOpen() {
    if (!activeRendered) return;
    try {
      await navigator.clipboard.writeText(activeRendered.renderedPrompt);
      const { url, mode } = activeRendered.launchPlan;
      const launched = Boolean(url);
      if (url) {
        if (url.startsWith("claude://")) {
          window.location.href = url;
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
      await markRunLaunchedAction(activeRendered.runId, launched);
      setMessage(mode === "copy_only" ? "Prompt copied." : "Prompt copied and app opened.");
    } catch {
      setMessage("Browser clipboard access failed. Select the rendered prompt text and copy it manually, then open the target app.");
    }
  }

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
            <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
              {themes.map((theme) => {
                const checked = themeSlugs.includes(theme.slug);
                return (
                  <label
                    key={theme.slug}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${
                      checked ? "border-[var(--text)] bg-[var(--soft)]" : "border-[var(--border)] bg-[var(--bg)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTheme(theme.slug)}
                    />
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: theme.color }} />
                    <span className="min-w-0 flex-1 text-sm font-medium">{theme.name}</span>
                    <span className="badge">{theme.tickers.length}</span>
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
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg)] p-2">
              <div className="grid gap-1">
                {visibleTickers.map((ticker) => {
                  const checked = selectedTickers.includes(ticker.symbol);
                  const disabled = !checked && selectedTickers.length >= MAX_TICKERS;
                  return (
                    <label
                      key={ticker.symbol}
                      className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition ${
                        checked ? "bg-[var(--soft)]" : "hover:bg-[var(--soft)]"
                      } ${disabled ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleTicker(ticker.symbol)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-sm font-semibold">{ticker.symbol}</span>
                        {ticker.companyName && <span className="text-sm text-[var(--muted)]"> · {ticker.companyName}</span>}
                        {ticker.dataStatus === "UNVERIFIED" && <span className="text-xs text-[var(--bad)]"> · unverified</span>}
                      </span>
                    </label>
                  );
                })}
                {!visibleTickers.length && (
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

          <Field label="Research type">
            <input className="input" value={researchType} onChange={(e) => setResearchType(e.target.value)} />
          </Field>

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

      <section className="panel panel-pad">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
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

        <textarea
          className="textarea min-h-[760px] text-sm leading-7 xl:min-h-[calc(100vh-310px)]"
          value={activeRendered?.renderedPrompt || livePreview}
          readOnly
        />
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
    </label>
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
    .replaceAll("{{lookback}}", values.lookback)
    .replaceAll("{{financial_window}}", values.financialWindow)
    .replaceAll("{{horizon}}", values.horizon)
    .replaceAll("{{local_context}}", localContext)
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
