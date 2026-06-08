// Shared display formatters. Keep pure & dependency-free.
export function fmtMoney(value?: number | null, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
export function fmtCompact(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return `${value}`;
}
export function fmtMoneyCompact(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";                                                                         
  return `$${fmtCompact(value)}`;
}
export function fmtPct(value?: number | null, opts: { sign?: boolean; decimals?: number } = {}): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const decimals = opts.decimals ?? 2;
  const sign = opts.sign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}
export function fmtMultiple(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}x`;
}
export function fmtConfidence(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `conf ${Math.max(1, Math.min(5, Math.round(value)))}/5`;
}
