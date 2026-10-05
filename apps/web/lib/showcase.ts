import type { CardDto, Rarity } from "@wikideck/shared";

const SAMPLES: { slug: string; rarity: Rarity; views: number; attack: number; defense: number }[] =
  [
    { slug: "Loup", rarity: "RARE", views: 3_100, attack: 4_320, defense: 3_700 },
    { slug: "Colisée", rarity: "SUPER_RARE", views: 7_400, attack: 5_960, defense: 4_900 },
    { slug: "Albert_Einstein", rarity: "LEGENDARY", views: 142_000, attack: 9_120, defense: 6_840 },
    { slug: "Frida_Kahlo", rarity: "ULTRA_RARE", views: 21_000, attack: 6_480, defense: 5_760 },
    { slug: "Ada_Lovelace", rarity: "UNCOMMON", views: 4_200, attack: 3_080, defense: 2_900 },
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
          attack: s.attack,
          defense: s.defense,
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
