import type { CardDto, Rarity } from "@wikideck/shared";

const SAMPLES: { slug: string; rarity: Rarity; views: number }[] = [
  { slug: "Loup", rarity: "RARE", views: 3_100 },
  { slug: "Colisée", rarity: "SUPER_RARE", views: 7_400 },
  { slug: "Albert_Einstein", rarity: "LEGENDARY", views: 142_000 },
  { slug: "Frida_Kahlo", rarity: "ULTRA_RARE", views: 21_000 },
  { slug: "Ada_Lovelace", rarity: "UNCOMMON", views: 4_200 },
];

type Summary = {
  title: string;
  description?: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls: { desktop: { page: string } };
};

export async function getShowcase(): Promise<CardDto[]> {
  const cards = await Promise.all(
    SAMPLES.map(async (s): Promise<CardDto | null> => {
      try {
        const res = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${s.slug}`, {
          headers: { "User-Agent": "Wikideck/1.0 (https://wikideck.fr)" },
          next: { revalidate: 60 * 60 * 24 },
        });
        if (!res.ok) return null;
        const d = (await res.json()) as Summary;
        if (!d.thumbnail) return null;
        return {
          id: s.slug,
          title: d.title,
          description: d.description ?? null,
          extract: d.extract,
          imageUrl: d.thumbnail.source,
          url: d.content_urls.desktop.page,
          rarity: s.rarity,
          views: s.views,
        };
      } catch {
        return null;
      }
    }),
  );
  return cards.filter((c): c is CardDto => c !== null);
}

export const TICKER_TITLES = [
  "Albert Einstein",
  "Colisée",
  "Saturne",
  "Frida Kahlo",
  "Voie lactée",
  "Ada Lovelace",
  "Pyramide de Khéops",
  "Marie Curie",
  "Canis lupus",
  "Nikola Tesla",
  "Mont Blanc",
  "Léonard de Vinci",
];
