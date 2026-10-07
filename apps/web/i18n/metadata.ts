import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Messages } from "next-intl";

type PageKey = keyof Messages["meta"]["pages"];

// export const generateMetadata = pageMetadata("collection");
// le titre passe par le template du layout racine (« %s — Wikideck »)
export function pageMetadata(key: PageKey) {
  return async (): Promise<Metadata> => {
    const t = await getTranslations("meta.pages");
    return { title: t(key) };
  };
}
