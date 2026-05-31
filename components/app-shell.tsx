import Link from "next/link";
import {
  BarChart3,
  BookOpenText,
  Compass,
  Home,
  Library,
  ListChecks,
  Radar,
  Search,
  Tags,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/builder", label: "Builder", icon: Compass },
  { href: "/prompts", label: "Prompts", icon: Library },
  { href: "/runs", label: "Runs", icon: ListChecks },
  { href: "/research", label: "Research", icon: BookOpenText },
  { href: "/themes", label: "Themes", icon: Tags },
  { href: "/discoveries", label: "Discoveries", icon: Search },
  { href: "/insights", label: "Insights", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--border)] bg-[var(--panel)] px-4 py-5 lg:block">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--text)] text-[var(--bg)]">
            <Radar size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em]">Signal Desk</div>
            <div className="text-xs text-[var(--muted)]">AI infra research OS</div>
          </div>
        </Link>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)]"
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] px-4 py-3 backdrop-blur lg:hidden">
          <div className="mb-3 flex items-center gap-2">
            <Radar size={18} />
            <span className="text-sm font-semibold">Signal Desk</span>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="shrink-0 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
