import { DiscoveriesClient } from "@/components/discoveries-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DiscoveriesPage() {
  const [candidates, themes] = await Promise.all([
    prisma.discoveryCandidate.findMany({ orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }] }),
    prisma.theme.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Dynamic universe</div>
          <h1 className="page-title">Discoveries</h1>
          <p className="page-subtitle">
            The app stays curated, but research outputs can suggest new tickers for review before they enter the AI-infra universe.
          </p>
        </div>
      </div>
      <DiscoveriesClient
        candidates={candidates.map((candidate) => ({
          symbol: candidate.symbol,
          companyName: candidate.companyName,
          suggestedThemes: candidate.suggestedThemes,
          sourceLine: candidate.sourceLine,
          status: candidate.status,
          occurrences: candidate.occurrences,
          lastSeenAt: formatDate(candidate.lastSeenAt),
        }))}
        themes={themes}
      />
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
