"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { createThemeAction, createTickerAction } from "@/app/actions";

type ThemeRow = {
  slug: string;
  name: string;
  description: string;
  color: string;
  tickers: { symbol: string; role: string | null; dataStatus: string }[];
};

export function ThemesClient({ themes }: { themes: ThemeRow[] }) {
  const [themeForm, setThemeForm] = useState({ slug: "", name: "", description: "", color: "#2563eb" });
  const [tickerForm, setTickerForm] = useState({ symbol: "", companyName: "", notes: "", themeSlug: themes[0]?.slug ?? "" });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

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
      <section className="space-y-4">
        <div className="panel panel-pad">
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

        <div className="panel panel-pad">
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
        {message && <div className="panel panel-pad text-sm">{message}</div>}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {themes.map((theme) => (
          <article key={theme.slug} className="panel panel-pad">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: theme.color }} />
                  <h2 className="font-semibold">{theme.name}</h2>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">{theme.description}</p>
              </div>
              <span className="badge">{theme.tickers.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {theme.tickers.map((ticker) => (
                <span key={ticker.symbol} className="badge" title={ticker.role || undefined}>
                  {ticker.symbol}
                  {ticker.dataStatus === "UNVERIFIED" ? " ?" : ""}
                </span>
              ))}
            </div>
          </article>
        ))}
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
