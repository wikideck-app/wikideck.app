import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Messages } from "next-intl";

type PageKey = keyof Messages["meta"]["pages"];

// export const generateMetadata = pageMetadata("collection");
// Le titre passe par le template du layout racine (« %s — Wikideck »). Avec `path`, la page est
// publique : adresse canonique et Open Graph en plus. Une description propre à la page se déclare dans
// meta.descriptions ; sans elle, la page reprend celle du site.
export function pageMetadata(key: PageKey, options: { path?: string } = {}) {
  return async (): Promise<Metadata> => {
    const [t, d] = await Promise.all([getTranslations("meta.pages"), getTranslations("meta.descriptions")]);
    const title = t(key);
    const description = d.has(key as never) ? d(key as never) : undefined;
    return {
      title,
      ...(description && { description }),
      ...(options.path && {
        alternates: { canonical: options.path },
        openGraph: { title, url: options.path, ...(description && { description }) },
        twitter: { title, ...(description && { description }) },
      }),
    };
  };
}
