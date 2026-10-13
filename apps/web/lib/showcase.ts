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
          headers: { "User-Agent": "Wikideck/1.0 (https://wikideck.app)" },
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
  "One Piece",
  "Jujutsu Kaisen",
  "Naruto",
  "L’Attaque des Titans",
  "Spy x Family",
];

// personnages d'anime et de manga de la page d'accueil : tirés d'AniList (même source que le jeu), rareté d'illustration
const ANIME_SAMPLES: { search: string; rarity: Rarity }[] = [
  { search: "Anya Forger", rarity: "RARE" },
  { search: "Mikasa Ackerman", rarity: "SUPER_RARE" },
  { search: "Monkey D. Luffy", rarity: "LEGENDARY" },
  { search: "Satoru Gojo", rarity: "ULTRA_RARE" },
  { search: "Rem", rarity: "UNCOMMON" },
];

type AnilistCharacter = {
  id: number;
  siteUrl: string;
  favourites: number;
  name: { full: string };
  image: { large: string | null };
  media: { nodes: { isAdult: boolean; title: { english: string | null; romaji: string | null } }[] };
} | null;

export async function getAnimeShowcase(): Promise<CardDto[]> {
  const fields = `id siteUrl favourites name { full } image { large } media(perPage: 1, sort: POPULARITY_DESC) { nodes { isAdult title { english romaji } } }`;
  const query = `query { ${ANIME_SAMPLES.map(
    (s, i) => `c${i}: Character(search: ${JSON.stringify(s.search)}, sort: FAVOURITES_DESC) { ${fields} }`,
  ).join(" ")} }`;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];
    const { data } = (await res.json()) as { data?: Record<string, AnilistCharacter> };
    if (!data) return [];
    return ANIME_SAMPLES.flatMap((s, i): CardDto[] => {
      const c = data[`c${i}`];
      const media = c?.media.nodes[0];
      if (!c || !c.image.large || media?.isAdult) return [];
      return [
        {
          id: `anime-${c.id}`,
          title: c.name.full,
          description: media?.title.english ?? media?.title.romaji ?? null,
          extract: "",
          imageUrl: c.image.large,
          url: c.siteUrl,
          rarity: s.rarity,
          views: c.favourites,
          source: "ANILIST",
        },
      ];
    });
  } catch {
    return [];
  }
}
