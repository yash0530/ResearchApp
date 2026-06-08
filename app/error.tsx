"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
      <div className="panel panel-pad max-w-md space-y-3">
        <h2 className="text-xl font-bold text-[var(--bad)]">Something went wrong!</h2>
        <p className="text-xs font-mono text-[var(--muted)] bg-[var(--soft)] p-2 rounded break-all">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex justify-center gap-2">
          <button onClick={() => reset()} className="btn btn-primary">
            Try again
          </button>
          <button onClick={() => window.location.href = "/"} className="btn">
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
