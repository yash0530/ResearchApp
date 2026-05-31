import { RunsClient } from "@/components/runs-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await prisma.researchRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      promptTemplate: true,
      entry: true,
    },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Execution log</div>
          <h1 className="page-title">Runs</h1>
          <p className="page-subtitle">
            Every rendered prompt becomes a run. Paste the external output back here to create structured research.
          </p>
        </div>
      </div>
      <RunsClient
        runs={runs.map((run) => ({
          id: run.id,
          sourceApp: run.sourceApp,
          status: run.status,
          createdAt: formatDate(run.createdAt),
          promptTitle: run.promptTemplate?.title || "Ad hoc run",
          renderedPrompt: run.renderedPrompt,
          entry: run.entry
            ? {
                id: run.entry.id,
                title: run.entry.title,
                summary: run.entry.summary,
                parseStatus: run.entry.parseStatus,
              }
            : null,
        }))}
      />
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
