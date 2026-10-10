"use client";

import { useFormatter, useTranslations } from "next-intl";
import { playerTitle } from "@wikideck/shared";

/** Titre gagné avec le nombre de cartes Wikipédia différentes (l'anime / manga ne compte pas). */
export function PlayerTitleBadge({ cards, className = "" }: { cards: number; className?: string }) {
  const t = useTranslations("titles");
  const format = useFormatter();
  const { title } = playerTitle(cards);
  return (
    <span
      title={t("hint", { count: format.number(title.min) })}
      className={`inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-bold ${className}`}
    >
      <span aria-hidden>{title.emoji}</span>
      {t(`names.${title.key}`)}
    </span>
  );
}

/** Progression vers le titre suivant. */
export function PlayerTitleProgress({ cards, className = "" }: { cards: number; className?: string }) {
  const t = useTranslations("titles");
  const format = useFormatter();
  const { title, next } = playerTitle(cards);
  if (!next) return <p className={className}>{t("max", { name: `${title.emoji} ${t(`names.${title.key}`)}` })}</p>;
  const ratio = Math.min(1, (cards - title.min) / (next.min - title.min));
  return (
    <div className={className}>
      <p>
        {t("next", {
          name: `${next.emoji} ${t(`names.${next.key}`)}`,
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
