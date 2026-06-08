"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Mode = "light" | "dark";

function currentMode(): Mode {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light");
  const [mounted, setMounted] = useState(false);

  // Read the real theme only after mount to avoid an SSR/CSR hydration mismatch.
  useEffect(() => {
    setMode(currentMode());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("signal-desk-theme", next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    setMode(next);
  }

  const isDark = mounted && mode === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      title="Toggle light / dark"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)]"
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
