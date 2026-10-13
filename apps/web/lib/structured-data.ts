import { DISCORD_URL, SAME_AS, SITE_URL, X_URL } from "@/lib/site";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#app`;

export const organization = (name: string) => ({
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name,
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.webp`, width: 512, height: 512 },
  sameAs: [...SAME_AS, X_URL, DISCORD_URL].filter((u, i, all) => all.indexOf(u) === i),
});

export const website = (name: string, description: string, locale: string) => ({
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE_URL,
  name,
  description,
  inLanguage: locale,
  publisher: { "@id": ORGANIZATION_ID },
});

export const webApplication = (name: string, description: string, locale: string, features: string[]) => ({
  "@type": "WebApplication",
  "@id": APP_ID,
  name,
  url: SITE_URL,
  description,
  image: `${SITE_URL}/opengraph-image.png`,
  applicationCategory: "GameApplication",
  genre: ["Jeu de cartes à collectionner", "Quiz et culture générale", "Anime et manga"],
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  inLanguage: locale,
  isAccessibleForFree: true,
  featureList: features,
  publisher: { "@id": ORGANIZATION_ID },
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
});

export const faqPage = (items: { q: string; a: string }[]) => ({
  "@type": "FAQPage",
  mainEntity: items.map((i) => ({
    "@type": "Question",
    name: i.q,
    acceptedAnswer: { "@type": "Answer", text: i.a },
  })),
});

export const breadcrumbs = (trail: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: t.name,
    item: `${SITE_URL}${t.path === "/" ? "" : t.path}`,
  })),
});

export const webPage = (name: string, description: string, path: string, locale: string) => ({
  "@type": "WebPage",
  "@id": `${SITE_URL}${path}#webpage`,
  url: `${SITE_URL}${path}`,
  name,
  description,
  inLanguage: locale,
  isPartOf: { "@id": WEBSITE_ID },
  about: { "@id": APP_ID },
});

export const graph = (...nodes: Record<string, unknown>[]) => ({ "@context": "https://schema.org", "@graph": nodes });
