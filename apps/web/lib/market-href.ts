import {
  RARITIES,
  type MarketSort,
  type MarketView,
  type PackKind,
  type Rarity,
} from "@wikideck/shared";

export type MarketViewState = {
  page?: number;
  view?: MarketView;
  sort?: MarketSort;
  rarities?: Rarity[];
  query?: string;
  source?: PackKind | null;
};

export function marketHref({ page, view, sort, rarities, query, source }: MarketViewState) {
  const qs = new URLSearchParams();
  if (source) qs.set("source", source);
  if (query) qs.set("q", query);
  if (view && view !== "all") qs.set("view", view);
  if (sort && sort !== "ending") qs.set("sort", sort);
  if (rarities?.length) {
    qs.set(
      "rarity",
      RARITIES.filter((r) => rarities.includes(r.value))
        .map((r) => r.code)
        .join(","),
    );
  }
  if (page && page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `/market?${s}` : "/market";
}
