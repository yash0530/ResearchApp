"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { cloneElement, type ReactElement } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ListOrdered,
  AlertTriangle,
  Brain,
  Activity,
  Target,
  Clock,
  TrendingUp,
} from "lucide-react";
import { prettifyEnum } from "@/lib/enums";

type Datum = Record<string, string | number | null>;

type InsightsChartsProps = {
  tickerMentions: Datum[];
  themeSignals: Datum[];
  riskSeverity: Datum[];
  verdictStances: Datum[];
  cycleDistribution: Datum[];
  sentimentBreakdown: Array<{ name: string; bullish: number; neutral: number; bearish: number }>;
  targetVsPriceGap: Array<{ name: string; target: number; price: number | null; gapPct: number }>;
  priorityQueue: Array<{ id: string; ticker: string | null; themeSlug: string | null; stance: string; priority: number; rationale: string; entryId: string; entryTitle: string }>;
  openQuestions: { text: string; ticker: string | null; themeSlug: string | null }[];
};

export function InsightsCharts({
  tickerMentions,
  themeSignals,
  riskSeverity,
  verdictStances,
  cycleDistribution,
  sentimentBreakdown,
  targetVsPriceGap,
  priorityQueue,
  openQuestions,
}: InsightsChartsProps) {
  return (
    <div className="space-y-6">
      {/* FIRST GRID: MENTIONS, THEME, RISKS, VERDICTS */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartPanel title="Ticker Mentions" subtitle="How often active research names a ticker.">
          <BarChart data={tickerMentions}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Theme Signals" subtitle="Parsed THEME lines by category.">
          <BarChart data={themeSignals}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--good)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Risk Severity" subtitle="Risk lines grouped by severity.">
          <BarChart data={riskSeverity}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--bad)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Verdict Stance Mix" subtitle="Parsed verdicts by decision type.">
          <BarChart data={verdictStances}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--warn)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartPanel>
      </div>

      {/* SECOND GRID: THEME CYCLE STAGES, SENTIMENTS, GAP CHART */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartPanel title="Theme Cycle Stages" subtitle="Active themes grouped by current market phase.">
          <BarChart data={cycleDistribution}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Sentiment Breakdown per Ticker" subtitle="Bullish vs Bearish vs Neutral mentions.">
          <BarChart data={sentimentBreakdown}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 5 }} />
            <Bar dataKey="bullish" fill="var(--good)" name="Bullish" stackId="a" />
            <Bar dataKey="neutral" fill="var(--muted)" name="Neutral" stackId="a" />
            <Bar dataKey="bearish" fill="var(--bad)" name="Bearish" stackId="a" />
          </BarChart>
        </ChartPanel>

        <ChartPanel title="Target vs Grounded Price Gap" subtitle="Comparing average analyst targets with latest stock price.">
          <BarChart data={targetVsPriceGap}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 5 }} />
            <Bar dataKey="target" fill="var(--accent)" name="Avg Target" radius={[4, 4, 0, 0]} />
            <Bar dataKey="price" fill="var(--good)" name="Grounded Price" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartPanel>

        {/* Small explainer card */}
        <div className="panel panel-pad bg-gradient-to-br from-[var(--panel)] to-[var(--soft)]/20 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
              <Brain size={16} className="text-[var(--accent)] animate-pulse" /> Decision Engine Telemetry
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              These charts run pure parsed metadata extracted from external research sessions (Perplexity, Claude, etc.).
            </p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              By pairing **average analyst targets** with **grounded stock prices**, we highlight disconnects where external research expects significant re-ratings relative to current S&P 500 fundamentals.
            </p>
          </div>
          <div className="text-[10px] text-[var(--muted)] font-mono border-t border-[var(--border)] pt-2 mt-3">
            System status: Grounded mapping active
          </div>
        </div>
      </div>

      {/* RESEARCH PRIORITY QUEUE TABLE */}
      <section className="panel panel-pad">
        <div className="mb-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <ListOrdered size={18} className="text-[var(--accent)]" /> Active Research Priority Queue
          </h2>
          <p className="text-xs text-[var(--muted)]">Highest conviction verdicts (RESEARCH_NOW and priority ratings) awaiting targeted allocation or execution.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider font-mono">
                <th className="py-2.5 font-bold">Stance</th>
                <th className="py-2.5 font-bold">Ticker</th>
                <th className="py-2.5 font-bold">Theme</th>
                <th className="py-2.5 font-bold text-center">Priority</th>
                <th className="py-2.5 font-bold">Investment Rationale</th>
                <th className="py-2.5 font-bold text-right">Entry</th>
              </tr>
            </thead>
            <tbody>
              {priorityQueue.map((v) => (
                <tr key={v.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--soft)]/50 transition">
                  <td className="py-3 font-mono">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${v.stance === "RESEARCH_NOW" ? "bg-amber-500/10 text-amber-500" : v.stance === "WATCH" ? "bg-blue-500/10 text-blue-500" : v.stance === "AVOID" ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-400"}`}>
                      {prettifyEnum(v.stance)}
                    </span>
                  </td>
                  <td className="py-3 font-mono font-bold">
                    {v.ticker ? (
                      <Link href={`/tickers/${v.ticker}`} className="text-[var(--accent)] hover:underline">
                        ${v.ticker}
                      </Link>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="py-3 font-mono text-[var(--muted)]">{v.themeSlug || "—"}</td>
                  <td className="py-3 text-center font-mono font-semibold">
                    <span className="badge text-[10px] bg-[var(--soft)]">{v.priority}</span>
                  </td>
                  <td className="py-3 max-w-sm truncate text-[var(--text)]" title={v.rationale}>
                    {v.rationale}
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/research/${v.entryId}`} className="text-[var(--accent)] hover:underline font-semibold">
                      {v.entryTitle}
                    </Link>
                  </td>
                </tr>
              ))}
              {!priorityQueue.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[var(--muted)] italic">
                    No active verdicts recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* OPEN QUESTIONS LEDGER */}
      <section className="panel panel-pad">
        <div className="mb-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <HelpCircle size={18} className="text-[var(--warn)]" /> Open Research Questions
          </h2>
          <p className="text-xs text-[var(--muted)]">Targeted knowledge gaps that require detailed investigation.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider font-mono">
                <th className="py-2.5 font-bold">Question</th>
                <th className="py-2.5 font-bold">Ticker</th>
                <th className="py-2.5 font-bold">Theme</th>
              </tr>
            </thead>
            <tbody>
              {openQuestions.map((q, idx) => (
                <tr key={idx} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--soft)]/50 transition">
                  <td className="py-3 font-medium text-[var(--text)]">{q.text}</td>
                  <td className="py-3 font-mono font-bold">
                    {q.ticker ? (
                      <Link href={`/tickers/${q.ticker}`} className="text-[var(--accent)] hover:underline">
                        ${q.ticker}
                      </Link>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="py-3 text-[var(--muted)] font-mono">{q.themeSlug || "—"}</td>
                </tr>
              ))}
              {!openQuestions.length && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-[var(--muted)] italic">
                    No active open questions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactElement<{ width?: number; height?: number }>;
}) {
  return (
    <section className="panel panel-pad bg-[var(--panel)]">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
          <Activity size={14} className="text-[var(--accent)]" /> {title}
        </h2>
        <p className="text-[11px] text-[var(--muted)]">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        {cloneElement(children, { width: 620, height: 260 })}
      </div>
    </section>
  );
}

const tooltipStyle = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: 11,
};
