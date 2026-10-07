import type { Rarity } from "@wikideck/shared";

export const RARITY_COLOR: Record<Rarity, string> = {
  MYTHIC: "var(--rarity-m)",
  LEGENDARY: "var(--rarity-l)",
  ULTRA_RARE: "var(--rarity-ur)",
  SUPER_RARE: "var(--rarity-sr)",
  RARE: "var(--rarity-r)",
  UNCOMMON: "var(--rarity-pc)",
  COMMON: "var(--rarity-c)",
};
