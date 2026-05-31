import { PromptManager } from "@/components/prompt-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const prompts = await prisma.promptTemplate.findMany({
    orderBy: [{ isFavorite: "desc" }, { title: "asc" }],
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Research contracts</div>
          <h1 className="page-title">Prompts</h1>
          <p className="page-subtitle">
            Maintain the canonical prompt pack. Each template should produce readable analysis plus the strict Signal Desk parse block.
          </p>
        </div>
      </div>
      <PromptManager prompts={prompts} />
    </div>
  );
}
