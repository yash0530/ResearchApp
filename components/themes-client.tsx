"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Plus, Clock, Activity, Target, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { createThemeAction, createTickerAction } from "@/app/actions";
import { prettifyEnum } from "@/lib/enums";

type ThemeRow = {
  slug: string;
  name: string;
  description: string;
  color: string;
  cycleStage: string | null;
  crowding: string | null;
  tickers: { symbol: string; role: string | null; dataStatus: string }[];
  verdicts: Array<{ id: string; ticker: string | null; stance: string; priority: number | null; rationale: string; entryId: string; entryTitle: string }>;
};

export function ThemesClient({ themes }: { themes: ThemeRow[] }) {
  const [themeForm, setThemeForm] = useState({ slug: "", name: "", description: "", color: "#2563eb" });
  const [tickerForm, setTickerForm] = useState({ symbol: "", companyName: "", notes: "", themeSlug: themes[0]?.slug ?? "" });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Collapsed states for theme verdicts
  const [expandedVerdicts, setExpandedVerdicts] = useState<Record<string, boolean>>({});

  function toggleVerdicts(slug: string) {
    setExpandedVerdicts((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  function saveTheme() {
    startTransition(async () => {
      await createThemeAction(themeForm);
      setMessage("Theme saved.");
      setThemeForm({ slug: "", name: "", description: "", color: "#2563eb" });
    });
  }

  function saveTicker() {
    startTransition(async () => {
      await createTickerAction(tickerForm);
      setMessage("Ticker saved.");
      setTickerForm({ ...tickerForm, symbol: "", companyName: "", notes: "" });
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      {/* Forms Section */}
      <section className="space-y-4">
        <div className="panel panel-pad bg-[var(--panel)]">
          <h2 className="text-lg font-semibold">Add / Update Theme</h2>
          <div className="mt-4 space-y-3">
            <Field label="Slug">
              <input className="input" value={themeForm.slug} onChange={(e) => setThemeForm({ ...themeForm, slug: slugify(e.target.value) })} />
            </Field>
            <Field label="Name">
              <input className="input" value={themeForm.name} onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })} />
            </Field>
            <Field label="Description">
              <textarea className="textarea min-h-24" value={themeForm.description} onChange={(e) => setThemeForm({ ...themeForm, description: e.target.value })} />
            </Field>
            <Field label="Color">
              <input className="input" value={themeForm.color} onChange={(e) => setThemeForm({ ...themeForm, color: e.target.value })} />
            </Field>
            <button className="btn btn-primary w-full" onClick={saveTheme} disabled={isPending}>
              <Plus size={15} /> Save theme
            </button>
          </div>
        </div>

        <div className="panel panel-pad bg-[var(--panel)]">
          <h2 className="text-lg font-semibold">Add / Update Ticker</h2>
          <div className="mt-4 space-y-3">
            <Field label="Symbol">
              <input className="input font-mono" value={tickerForm.symbol} onChange={(e) => setTickerForm({ ...tickerForm, symbol: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Company name">
              <input className="input" value={tickerForm.companyName} onChange={(e) => setTickerForm({ ...tickerForm, companyName: e.target.value })} />
            </Field>
            <Field label="Theme">
              <select className="select" value={tickerForm.themeSlug} onChange={(e) => setTickerForm({ ...tickerForm, themeSlug: e.target.value })}>
                {themes.map((theme) => (
                  <option key={theme.slug} value={theme.slug}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <textarea className="textarea min-h-24" value={tickerForm.notes} onChange={(e) => setTickerForm({ ...tickerForm, notes: e.target.value })} />
            </Field>
            <button className="btn btn-primary w-full" onClick={saveTicker} disabled={isPending}>
              <Plus size={15} /> Save ticker
            </button>
          </div>
        </div>
        {message && <div className="panel panel-pad text-sm bg-[var(--panel)]">{message}</div>}
      </section>

      {/* Grid of Enriched Theme Cards */}
      <section className="grid gap-3 lg:grid-cols-2 items-start">
        {themes.map((theme) => {
          const isExpanded = expandedVerdicts[theme.slug] || false;

          // Color tags for cycle stages
          const cycleColors: Record<string, string> = {
            DORMANT: "bg-gray-500/10 text-gray-400 border-gray-500/20",
            EMERGING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            HEATING_UP: "bg-amber-500/10 text-amber-500 border-amber-500/20",
            CROWDED: "bg-red-500/10 text-red-500 border-red-500/20",
            ROLLING_OVER: "bg-purple-500/10 text-purple-500 border-purple-500/20",
          };

          const crowdingColors: Record<string, string> = {
            HIGH: "bg-red-500/10 text-red-500 border-red-500/20",
            MEDIUM: "bg-amber-500/10 text-amber-500 border-amber-500/20",
            LOW: "bg-teal-500/10 text-teal-500 border-teal-500/20",
          };

          return (
            <article key={theme.slug} className="panel panel-pad bg-[var(--panel)] flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: theme.color }} />
                      <h2 className="font-bold text-base text-[var(--text)]">{theme.name}</h2>
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">{theme.description}</p>
                  </div>
                  <span className="badge shrink-0 font-mono text-[10px]">{theme.tickers.length} tickers</span>
                </div>

                {/* Cycle Stage & Crowding indicators */}
                {(theme.cycleStage || theme.crowding) && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {theme.cycleStage && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${cycleColors[theme.cycleStage] || "bg-[var(--soft)] text-[var(--muted)]"}`}>
                        Cycle: {prettifyEnum(theme.cycleStage)}
                      </span>
                    )}
                    {theme.crowding && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${crowdingColors[theme.crowding] || "bg-[var(--soft)] text-[var(--muted)]"}`}>
                        Crowding: {theme.crowding}
                      </span>
                    )}
                  </div>
                )}

                {/* Ticker Badges list */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {theme.tickers.map((ticker) => (
                    <Link
                      key={ticker.symbol}
                      href={`/tickers/${ticker.symbol}`}
                      className="badge text-[10px] hover:border-[var(--accent)] hover:text-[var(--accent)] font-mono transition"
                      title={ticker.role || undefined}
                    >
                      {ticker.symbol}
                      {ticker.dataStatus === "UNVERIFIED" ? " ?" : ""}
                    </Link>
                  ))}
                  {theme.tickers.length === 0 && (
                    <span className="text-[10px] text-[var(--muted)] italic">No tickers assigned yet.</span>
                  )}
                </div>
              </div>

              {/* Related Verdicts dropdown */}
              {theme.verdicts.length > 0 && (
                <div className="border-t border-[var(--border)] pt-3.5 mt-2 space-y-2">
                  <button
                    onClick={() => toggleVerdicts(theme.slug)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-[var(--muted)] uppercase hover:text-[var(--text)] transition cursor-pointer select-none"
                  >
                    <span className="flex items-center gap-1.5">
                      <Target size={12} className="text-[var(--accent)]" />
                      Active Verdicts ({theme.verdicts.length})
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pt-1.5 animate-fadeIn">
                      {theme.verdicts.map((v) => (
                        <div key={v.id} className="p-2 rounded bg-[var(--bg)] border border-[var(--border)]/50 text-[11px] space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold font-mono text-[var(--text)]">
                              {v.ticker ? `$${v.ticker}` : "THEME"}
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 rounded uppercase font-mono ${v.stance === "RESEARCH_NOW" ? "bg-amber-500/10 text-amber-500" : v.stance === "WATCH" ? "bg-blue-500/10 text-blue-500" : v.stance === "AVOID" ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-400"}`}>
                              {prettifyEnum(v.stance)}
                            </span>
                          </div>
                          <p className="text-[var(--text)] leading-relaxed font-medium line-clamp-2">{v.rationale}</p>
                          <div className="text-[9px] text-[var(--muted)] flex justify-between">
                            <span>From: {v.entryTitle}</span>
                            <Link href={`/research/${v.entryId}`} className="text-[var(--accent)] hover:underline">
                              view
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
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

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
