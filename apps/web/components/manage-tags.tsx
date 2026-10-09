"use client";

import { Plus, Trash2, X } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { TAG_MAX_PER_USER, TAG_NAME_MAX, type TagColor, type TagDto } from "@wikideck/shared";
import { useConfirm } from "@/components/confirm-dialog";
import { TagColorField } from "@/components/tag-color-field";
import { apiCall } from "@/lib/tags-api";

type TagRow = TagDto & { count: number };

const randomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  const a = 0.7 * Math.min(0.75, 1 - 0.75);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const v = 0.75 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export function ManageTags({ apiUrl, tags }: { apiUrl: string; tags: TagRow[] }) {
  const t = useTranslations("tags");
  const tc = useTranslations("common");
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { confirm, dialog: confirmDialog } = useConfirm();
  const refresh = () => startTransition(() => router.refresh());

  const [name, setName] = useState("");
  // couleur fixe au rendu (le serveur et le client doivent s'accorder) ; une couleur aléatoire est tirée à l'ouverture
  const [color, setColor] = useState<TagColor>("#c193ec");
  const [creating, setCreating] = useState(false);
  const cleanName = name.trim().replace(/\s+/g, " ");
  const full = tags.length >= TAG_MAX_PER_USER;

  async function create() {
    if (!cleanName || creating || full) return;
    setCreating(true);
    setError(null);
    const res = await apiCall<TagDto>(apiUrl, "/tags", "POST", { name: cleanName, color });
    setCreating(false);
    if (!res.ok) return setError(res.message);
    setName("");
    setColor(randomColor());
    refresh();
  }

  async function update(tag: TagRow, patch: { name?: string; color?: TagColor }) {
    setError(null);
    const res = await apiCall(apiUrl, `/tags/${tag.id}`, "PATCH", patch);
    if (!res.ok) setError(res.message);
    refresh();
  }

  async function remove(tag: TagRow) {
    const ok = await confirm({
      title: t("confirmDelete", { name: tag.name }),
      message: tag.count > 0 ? t("deleteUsed", { count: tag.count }) : t("deleteUnused"),
      confirmLabel: tc("delete"),
      danger: true,
    });
    if (!ok) return;
    const res = await apiCall(apiUrl, `/tags/${tag.id}`, "DELETE");
    if (!res.ok) setError(res.message);
    refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setColor(randomColor());
          dialog.current?.showModal();
        }}
        className="rounded-lg border border-accent/60 px-3 py-1.5 text-[11px] uppercase tracking-wide hover:bg-accent/10"
      >
        {t("manage")}
      </button>

      {confirmDialog}
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-surface p-7 text-foreground backdrop:bg-black/60"
      >
        <button
          type="button"
          aria-label={tc("close")}
          onClick={() => dialog.current?.close()}
          className="absolute right-4 top-4 opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
        <h2 className="text-xl font-bold">{t("manage")}</h2>
        <p className="mt-1 text-sm opacity-60">
          {t("manageIntro", { count: tags.length, max: TAG_MAX_PER_USER })}
        </p>

        <form
          className="mt-4 rounded-xl border border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={TAG_NAME_MAX}
              placeholder={t("newName")}
              aria-label={t("newName")}
              disabled={full}
              className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!cleanName || creating || full}
              className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              <Plus className="size-4" /> {tc("create")}
            </button>
          </div>
          <div className="mt-2">
            <TagColorField
              value={color}
              onChange={setColor}
              label={t("newColor")}
            />
          </div>
          {full && (
            <p className="mt-2 text-xs text-fog">
              {t("limitReached", { max: TAG_MAX_PER_USER })}
            </p>
          )}
        </form>

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}

        {tags.length === 0 ? (
          <p className="mt-6 text-sm opacity-60">{t("none")}</p>
        ) : (
          <ul className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {tags.map((tag) => (
              <li
                key={`${tag.id}-${tag.name}`}
                className="rounded-xl border border-line p-3 bg-surface"
              >
                <div className="flex items-center gap-2">
                  <input
                    defaultValue={tag.name}
                    maxLength={TAG_NAME_MAX}
                    aria-label={t("nameOf", { name: tag.name })}
                    // on enregistre en quittant le champ
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next && next !== tag.name) void update(tag, { name: next });
                      else e.target.value = tag.name;
                    }}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-2 py-1 text-sm outline-none focus:border-accent"
                  />
                  <span className="text-xs opacity-50">{t("cardCount", { count: tag.count })}</span>
                  <button
                    type="button"
                    aria-label={t("delete", { name: tag.name })}
                    onClick={() => void remove(tag)}
                    className="text-danger opacity-70 hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2">
                  <TagColorField
                    key={`${tag.id}-${tag.color}`}
                    value={tag.color}
                    label={t("colorOf", { name: tag.name })}
                    onCommit={(c) => void update(tag, { color: c })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </dialog>
    </>
  );
}
