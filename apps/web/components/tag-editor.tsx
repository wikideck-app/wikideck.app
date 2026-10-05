"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TAG_NAME_MAX, type TagColor, type TagDto } from "@wikideck/shared";
import { TagColorField } from "@/components/tag-color-field";
import { TagChip } from "@/components/tag-chip";
import { apiCall } from "@/lib/tags-api";

export function TagEditor({
  apiUrl,
  cardId,
  cardTags,
  allTags,
  onChange,
}: {
  apiUrl: string;
  cardId: string;
  cardTags: TagDto[];
  allTags: TagDto[];
  onChange?: (cardTags: TagDto[], allTags: TagDto[]) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const [color, setColor] = useState<TagColor>("#cba6f7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = input.trim();
  const match = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
  const assigned = new Set(cardTags.map((t) => t.id));
  const suggestions = allTags
    .filter((t) => !assigned.has(t.id) && t.name.toLowerCase().includes(name.toLowerCase()))
    .slice(0, 6);

  async function save(ids: string[], all = allTags) {
    const res = await apiCall<{ tags: TagDto[] }>(apiUrl, `/collection/${cardId}/tags`, "PUT", {
      tagIds: ids,
    });
    if (!res.ok) return setError(res.message);
    if (onChange) onChange(res.data.tags, all);
    else startTransition(() => router.refresh());
  }

  async function add(existing?: TagDto) {
    if (busy || (!existing && !name)) return;
    setBusy(true);
    setError(null);
    let tag = existing ?? match;
    let all = allTags;
    if (!tag) {
      const created = await apiCall<TagDto>(apiUrl, "/tags", "POST", { name, color });
      if (!created.ok) {
        setBusy(false);
        return setError(created.message);
      }
      tag = created.data;
      all = [...allTags, tag];
    }
    if (!assigned.has(tag.id)) await save([...assigned, tag.id], all);
    else if (all !== allTags) onChange?.(cardTags, all);
    setInput("");
    setColor("#cba6f7");
    setBusy(false);
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">Étiquettes</h3>

      {cardTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cardTags.map((t) => (
            <TagChip
              key={t.id}
              tag={t}
              onRemove={() => save([...assigned].filter((id) => id !== t.id))}
            />
          ))}
        </div>
      )}

      <input
        value={input}
        maxLength={TAG_NAME_MAX}
        placeholder="Ajouter une étiquette…"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void add();
          }
        }}
        className="mt-2 w-full rounded-[20px] border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
      />

      {name && !match && (
        <div className="mt-2">
          <p className="text-xs opacity-60">
            Nouvelle étiquette — choisissez sa couleur (sélecteur ou code hexadécimal) :
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <TagColorField
              value={color}
              onChange={setColor}
              label="Couleur de la nouvelle étiquette"
            />
            <button
              type="button"
              onClick={() => void add()}
              disabled={busy}
              className="ml-auto rounded-[20px] bg-accent px-[18px] py-1 text-xs font-bold text-accent-foreground disabled:opacity-50"
            >
              Créer
            </button>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void add(t)}
              className="opacity-80 hover:opacity-100"
            >
              <TagChip tag={t} />
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
