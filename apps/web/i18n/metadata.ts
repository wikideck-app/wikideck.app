import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Messages } from "next-intl";

type PageKey = keyof Messages["meta"]["pages"];

// export const generateMetadata = pageMetadata("collection");
// Le titre passe par le template du layout racine (« %s — Wikideck »). Avec `path`, la page est
// publique : adresse canonique et Open Graph en plus.
export function pageMetadata(key: PageKey, options: { path?: string } = {}) {
  return async (): Promise<Metadata> => {
    const t = await getTranslations("meta.pages");
    const title = t(key);
    if (!options.path) return { title };
    return {
      title,
      alternates: { canonical: options.path },
      openGraph: { title, url: options.path },
    };
  };
}
