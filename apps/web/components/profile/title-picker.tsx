"use client";

import { Check, X } from "@/components/icons";
import { useFormatter, useTranslations } from "next-intl";
import { ANIME_TITLES, NO_TITLE, PLAYER_TITLES, titleId } from "@wikideck/shared";
import { useState } from "react";
import { buttonClass } from "@/components/settings/controls";
import { apiCall } from "@/lib/tags-api";

type Row = { id: string; kind: "wikipedia" | "anime"; key: string; emoji: string; min: number };

const ROWS: Row[] = [
  ...PLAYER_TITLES.map((x) => ({ id: titleId("wikipedia", x.key), kind: "wikipedia" as const, ...x })),
  ...ANIME_TITLES.map((x) => ({ id: titleId("anime", x.key), kind: "anime" as const, ...x })),
];

export function TitlePicker({
  apiUrl,
  wikipediaCards,
  animeCards,
  current,
  onClose,
}: {
  apiUrl: string;
  wikipediaCards: number;
  animeCards: number;
  /** identifiant du titre affiché, null = automatique */
  current: string | null;
  onClose: (changed: boolean) => void;
}) {
  const t = useTranslations("profile.titlePicker");
  const tt = useTranslations("titles");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [selected, setSelected] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  async function choose(id: string | null) {
    setBusy(true);
    setError(null);
    const res = await apiCall(apiUrl, "/me", "PATCH", { displayedTitle: id });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setSelected(id);
    setChanged(true);
  }

  const unlocked = (r: Row) => (r.kind === "anime" ? animeCards : wikipediaCards) >= r.min;
  const nameOf = (r: Row) => tt(`${r.kind === "anime" ? "animeNames" : "names"}.${r.key}` as never);
  const option = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      active ? "border-accent bg-accent/10" : "border-line hover:border-accent"
    }`;

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={() => onClose(changed)}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="mt-1 text-sm text-pale-mist">{t("description")}</p>
        </div>
        <button
          type="button"
          aria-label={tc("close")}
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          className="opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 max-h-[55vh] overflow-y-auto pr-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => void choose(null)}
          className={option(selected === null)}
        >
          <span className="flex-1 font-semibold">{t("automatic")}</span>
          {selected === null && <Check className="size-4 text-accent" />}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void choose(NO_TITLE)}
          className={`${option(selected === NO_TITLE)} mt-1.5`}
        >
          <span className="flex-1 font-semibold">{t("none")}</span>
          {selected === NO_TITLE && <Check className="size-4 text-accent" />}
        </button>
        {(["wikipedia", "anime"] as const).map((kind) => (
          <section key={kind} className="mt-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog">
              {t(`sections.${kind}`)}
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {ROWS.filter((r) => r.kind === kind).map((r) => {
                const open = unlocked(r);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={busy || !open}
                      onClick={() => void choose(r.id)}
                      className={option(selected === r.id)}
                    >
                      <span aria-hidden>{r.emoji}</span>
                      <span className="flex-1 font-semibold">{nameOf(r)}</span>
                      <span className="text-xs text-fog">
                        {open ? "" : t("locked", { count: format.number(r.min) })}
                      </span>
                      {selected === r.id && <Check className="size-4 text-accent" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className={buttonClass}
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
        >
          {t("done")}
        </button>
      </div>
    </dialog>
  );
}
