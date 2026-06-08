export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded bg-[var(--soft)]" />
      <div className="h-32 rounded-md border border-[var(--border)] bg-[var(--panel)]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 rounded-md border border-[var(--border)] bg-[var(--panel)]" />
        <div className="h-48 rounded-md border border-[var(--border)] bg-[var(--panel)]" />
      </div>
    </div>
  );
}
