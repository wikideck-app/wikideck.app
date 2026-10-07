import { useTranslations, type Messages } from "next-intl";
import type { Rarity } from "@wikideck/shared";

// libellé traduit d'une rareté (la rareté elle-même est une donnée du jeu, pas un texte)
export function useRarityLabel() {
  const t = useTranslations("cards.rarity");
  return (rarity: Rarity) => t(rarity);
}

// les clés du catalogue de succès (shared) sont des chaînes ; un test vérifie qu'elles ont toutes un texte
export type AchievementKey = Extract<keyof Messages["achievements"]["items"], string>;
export const achievementKey = (key: string) => key as AchievementKey;
