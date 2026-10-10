"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ANIME_TITLES, PLAYER_TITLES, animeTitle, parseTitleId, playerTitle } from "@wikideck/shared";

type Kind = "wikipedia" | "anime";

// titre gagné avec le nombre de cartes différentes : Wikipédia d'un côté, anime / manga de l'autre
function useTitle(kind: Kind, cards: number) {
  const t = useTranslations("titles");
  const result = kind === "anime" ? animeTitle(cards) : playerTitle(cards);
  const nameOf = (key: string) => t(`${kind === "anime" ? "animeNames" : "names"}.${key}` as never);
  return { t, ...result, nameOf };
}

/** Titre précis choisi par le joueur (« wikipedia:scholar », « anime:sensei »). */
export function ChosenTitleBadge({ id, className = "" }: { id: string; className?: string }) {
  const t = useTranslations("titles");
  const format = useFormatter();
  const chosen = parseTitleId(id);
  if (!chosen) return null;
  const list = chosen.kind === "anime" ? ANIME_TITLES : PLAYER_TITLES;
  const title = list.find((x) => x.key === chosen.key)!;
  return (
    <span
      title={t(chosen.kind === "anime" ? "hintAnime" : "hint", { count: format.number(title.min) })}
      className={`inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-bold ${className}`}
    >
      <span aria-hidden>{title.emoji}</span>
      {t(`${chosen.kind === "anime" ? "animeNames" : "names"}.${chosen.key}` as never)}
    </span>
  );
}

export function PlayerTitleBadge({
  cards,
  kind = "wikipedia",
  className = "",
}: {
  cards: number;
  kind?: Kind;
  className?: string;
}) {
  const format = useFormatter();
  const { t, title, nameOf } = useTitle(kind, cards);
  return (
    <span
      title={t(kind === "anime" ? "hintAnime" : "hint", { count: format.number(title.min) })}
      className={`inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-bold ${className}`}
    >
      <span aria-hidden>{title.emoji}</span>
      {nameOf(title.key)}
    </span>
  );
}

/** Progression vers le titre suivant. */
export function PlayerTitleProgress({
  cards,
  kind = "wikipedia",
  className = "",
}: {
  cards: number;
  kind?: Kind;
  className?: string;
}) {
  const format = useFormatter();
  const { t, title, next, nameOf } = useTitle(kind, cards);
  if (!next)
    return <p className={className}>{t("max", { name: `${title.emoji} ${nameOf(title.key)}` })}</p>;
  const ratio = Math.min(1, (cards - title.min) / (next.min - title.min));
  return (
    <div className={className}>
      <p>
        {t(kind === "anime" ? "nextAnime" : "next", {
          name: `${next.emoji} ${nameOf(next.key)}`,
          missing: format.number(next.min - cards),
          count: format.number(next.min),
        })}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-foreground/10"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
