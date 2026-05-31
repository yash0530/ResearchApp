"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Copy, Save, Star, Trash2, GitBranchPlus, Wand2 } from "lucide-react";
import {
  deletePromptAction,
  duplicatePromptAction,
  togglePromptFavoriteAction,
  togglePromptArchivedAction,
  upsertPromptAction,
} from "@/app/actions";
import { CADENCES, prettifyEnum } from "@/lib/enums";
import { parseJsonArray } from "@/lib/json";

type PromptRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  body: string;
  cadence: string;
  tags: string;
  isFavorite: boolean;
  isArchived: boolean;
};

const emptyPrompt = {
  id: "",
  title: "",
  slug: "",
  description: "",
  body: "",
  cadence: "AD_HOC",
  tags: "",
  isFavorite: false,
  isArchived: false,
};

export function PromptManager({ prompts }: { prompts: PromptRow[] }) {
  const [showArchived, setShowArchived] = useState(false);
  const visiblePrompts = useMemo(() => {
    return prompts.filter((p) => showArchived || !p.isArchived);
  }, [prompts, showArchived]);

  const [selectedId, setSelectedId] = useState(prompts[0]?.id ?? "");
  const selected = useMemo(() => prompts.find((prompt) => prompt.id === selectedId), [prompts, selectedId]);
  const [draft, setDraft] = useState<PromptRow>(selected ? hydrate(selected) : emptyPrompt);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function selectPrompt(id: string) {
    setSelectedId(id);
    const prompt = prompts.find((item) => item.id === id);
    setDraft(prompt ? hydrate(prompt) : emptyPrompt);
    setMessage("");
  }

  function save() {
    startTransition(async () => {
      await upsertPromptAction({
        id: draft.id || undefined,
        title: draft.title,
        slug: draft.slug,
        description: draft.description,
        body: draft.body,
        cadence: draft.cadence as never,
        tags: draft.tags,
      });
      setMessage("Prompt saved.");
    });
  }

  function duplicate(id: string) {
    startTransition(async () => {
      await duplicatePromptAction(id);
      setMessage("Prompt duplicated.");
    });
  }

  async function copyTemplate() {
    await navigator.clipboard.writeText(draft.body);
    setMessage("Template copied.");
  }

  function remove(id: string) {
    if (!window.confirm("Delete this prompt template? Existing runs keep their rendered prompt.")) return;
    startTransition(async () => {
      await deletePromptAction(id);
      setMessage("Prompt deleted.");
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="panel panel-pad">
        <div className="mb-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Prompt Library</h2>
              <p className="text-sm text-[var(--muted)]">{visiblePrompts.length} templates</p>
            </div>
            <button className="btn" onClick={() => { setSelectedId(""); setDraft(emptyPrompt); }}>
              New
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show Archived
          </label>
        </div>
        <div className="space-y-2">
          {visiblePrompts.map((prompt) => (
            <button
              key={prompt.id}
              className={`w-full rounded-md border p-3 text-left transition ${
                prompt.id === selectedId ? "border-[var(--text)] bg-[var(--soft)]" : "border-[var(--border)]"
              } ${prompt.isArchived ? "opacity-60 italic" : ""}`}
              onClick={() => selectPrompt(prompt.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{prompt.title}</span>
                {prompt.isFavorite && <Star size={14} className="fill-current" />}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-[var(--muted)]">
                <span>{prettifyEnum(prompt.cadence)}</span>
                {prompt.isArchived && <span className="badge text-[10px]">Archived</span>}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{draft.id ? "Edit Prompt" : "Create Prompt"}</h2>
            <p className="text-sm text-[var(--muted)]">Seeded prompts are editable so your research contract can evolve.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {draft.id && (
              <>
                <button className="btn" onClick={copyTemplate}>
                  <Copy size={15} /> Copy template
                </button>
                <Link className="btn" href={`/builder?prompt=${draft.id}`}>
                  <Wand2 size={15} /> Use in builder
                </Link>
                <button className="btn" onClick={() => duplicate(draft.id)}>
                  <GitBranchPlus size={15} /> Duplicate
                </button>
                <button className="btn" onClick={() => togglePromptFavoriteAction(draft.id, !draft.isFavorite)}>
                  <Star size={15} /> {draft.isFavorite ? "Unfavorite" : "Favorite"}
                </button>
                <button className="btn" onClick={() => togglePromptArchivedAction(draft.id, !draft.isArchived)}>
                  {draft.isArchived ? "Unarchive" : "Archive"}
                </button>
                <button className="btn btn-danger" onClick={() => remove(draft.id)}>
                  <Trash2 size={15} /> Delete
                </button>
              </>
            )}
            <button className="btn btn-primary" onClick={save} disabled={isPending}>
              <Save size={15} /> Save
            </button>
          </div>
        </div>

        {message && <div className="mb-4 rounded-md border border-[var(--border)] bg-[var(--soft)] p-3 text-sm">{message}</div>}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title">
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label="Slug">
            <input className="input" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} />
          </Field>
          <Field label="Cadence">
            <select className="select" value={draft.cadence} onChange={(e) => setDraft({ ...draft, cadence: e.target.value })}>
              {CADENCES.map((cadence) => (
                <option key={cadence} value={cadence}>
                  {prettifyEnum(cadence)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags">
            <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Description">
            <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Prompt body">
            <textarea className="textarea min-h-[760px]" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </Field>
        </div>
      </section>
    </div>
  );
}

function hydrate(prompt: PromptRow): PromptRow {
  return {
    ...prompt,
    tags: parseJsonArray(prompt.tags).join(", "),
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
