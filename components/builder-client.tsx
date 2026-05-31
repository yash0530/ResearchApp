"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { createRenderedRunAction, markRunLaunchedAction } from "@/app/actions";
import { FINANCIAL_WINDOWS, HORIZONS, LOOKBACKS, SOURCE_APP_LABELS, SOURCE_APPS, prettifyEnum } from "@/lib/enums";
import type { LaunchPlan } from "@/lib/launch";

type PromptOption = {
  id: string;
  title: string;
  description: string;
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
};

export function BuilderClient({
  prompts,
  themes,
  tickers,
}: {
  prompts: PromptOption[];
  themes: ThemeOption[];
  tickers: TickerOption[];
}) {
  const favorite = prompts.find((prompt) => prompt.isFavorite) ?? prompts[0];
  const [sourceApp, setSourceApp] = useState("PERPLEXITY");
  const [promptTemplateId, setPromptTemplateId] = useState(favorite?.id ?? "");
  const [themeSlugs, setThemeSlugs] = useState<string[]>(["memory_storage"]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>(["MU", "SNDK"].filter((ticker) => tickers.some((t) => t.symbol === ticker)));
  const [lookback, setLookback] = useState("30d");
  const [financialWindow, setFinancialWindow] = useState("last_6_quarters");
  const [horizon, setHorizon] = useState("next_12_months");
  const [researchType, setResearchType] = useState("dashboard");
  const [rendered, setRendered] = useState<RenderedRun | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredTickers = useMemo(() => {
    if (!themeSlugs.length) return tickers;
    return tickers.filter((ticker) => ticker.themeSlugs.some((slug) => themeSlugs.includes(slug)));
  }, [themeSlugs, tickers]);

  const selectedPrompt = prompts.find((prompt) => prompt.id === promptTemplateId);

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
        setRendered(result);
        setMessage("Prompt rendered with local context and run created.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not render prompt.");
      }
    });
  }

  async function copyAndOpen() {
    if (!rendered) return;
    await navigator.clipboard.writeText(rendered.renderedPrompt);
    const { url, mode } = rendered.launchPlan;
    const launched = Boolean(url);
    if (url) {
      if (url.startsWith("claude://")) {
        window.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
    await markRunLaunchedAction(rendered.runId, launched);
    setMessage(mode === "copy_only" ? "Prompt copied." : "Prompt copied and app opened.");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <section className="panel panel-pad">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Run Builder</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Choose the research contract, category filters, and investable universe.</p>
        </div>

        <div className="space-y-4">
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
            {selectedPrompt && <p className="mt-2 text-xs text-[var(--muted)]">{selectedPrompt.description}</p>}
          </Field>

          <Field label="Categories / themes">
            <select
              multiple
              className="select min-h-40"
              value={themeSlugs}
              onChange={(e) => setThemeSlugs(Array.from(e.target.selectedOptions).map((option) => option.value))}
            >
              {themes.map((theme) => (
                <option key={theme.slug} value={theme.slug}>
                  {theme.name} · {theme.tickers.length}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tickers">
            <select
              multiple
              className="select min-h-44 font-mono"
              value={selectedTickers}
              onChange={(e) => setSelectedTickers(Array.from(e.target.selectedOptions).map((option) => option.value))}
            >
              {filteredTickers.map((ticker) => (
                <option key={ticker.symbol} value={ticker.symbol}>
                  {ticker.symbol} {ticker.companyName ? `· ${ticker.companyName}` : ""} {ticker.dataStatus === "UNVERIFIED" ? "· unverified" : ""}
                </option>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTickers.map((ticker) => (
                <span key={ticker} className="badge">
                  {ticker}
                </span>
              ))}
            </div>
          </Field>

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
            {isPending ? "Rendering..." : "Render prompt + create run"}
          </button>

          {message && <div className="rounded-md border border-[var(--border)] bg-[var(--soft)] p-3 text-sm">{message}</div>}
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Rendered Prompt</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Copy-first launch keeps the workflow reliable across external apps.</p>
          </div>
          <button className="btn btn-primary" disabled={!rendered} onClick={copyAndOpen}>
            {rendered?.launchPlan.mode === "copy_only" ? <Copy size={16} /> : <ExternalLink size={16} />}
            {rendered?.launchPlan.label || "Copy / open"}
          </button>
        </div>

        <textarea
          className="textarea min-h-[650px]"
          value={rendered?.renderedPrompt || "Render a run to see the final prompt with selected themes, tickers, and local market context."}
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
