// seule locale active : en ajouter une = l'ajouter ici, créer messages/<locale>/ et
// brancher sa résolution dans i18n/request.ts (cookie, en-tête, sous-chemin...)
export const locales = ["fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

const RTL_LOCALES: readonly string[] = ["ar", "he", "fa", "ur"];

export function localeDirection(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale.split("-")[0]) ? "rtl" : "ltr";
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

// fuseau d'affichage des dates : le jeu tourne à l'heure de Paris
export const timeZone = "Europe/Paris";
