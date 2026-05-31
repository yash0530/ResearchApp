"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cloneElement, type ReactElement } from "react";

type Datum = Record<string, string | number | null>;

export function InsightsCharts({
  tickerMentions,
  themeSignals,
  riskSeverity,
  targetHistory,
}: {
  tickerMentions: Datum[];
  themeSignals: Datum[];
  riskSeverity: Datum[];
  targetHistory: Datum[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="Ticker Mentions" subtitle="How often active research names a ticker.">
        <BarChart data={tickerMentions}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartPanel>

      <ChartPanel title="Theme Signals" subtitle="Parsed THEME lines by category.">
        <BarChart data={themeSignals}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="var(--good)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartPanel>

      <ChartPanel title="Risk Severity" subtitle="Risk lines grouped by severity.">
        <BarChart data={riskSeverity}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="var(--bad)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartPanel>

      <ChartPanel title="Analyst Targets" subtitle="Average parsed target by ticker over time.">
        <LineChart data={targetHistory}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="target" stroke="var(--accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ChartPanel>
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
    <section className="panel panel-pad">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-[var(--muted)]">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        {cloneElement(children, { width: 620, height: 280 })}
      </div>
    </section>
  );
}

const tooltipStyle = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
};
