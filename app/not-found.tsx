import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-center">
      <div className="panel panel-pad max-w-md space-y-3">
        <h2 className="text-xl font-bold">Page Not Found</h2>
        <p className="text-sm text-[var(--muted)]">
          The requested research, runner, or route does not exist.
        </p>
        <Link href="/" className="btn btn-primary inline-flex">
          Back to Cockpit
        </Link>
      </div>
    </div>
  );
}
