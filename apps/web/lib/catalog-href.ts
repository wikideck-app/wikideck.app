import { RARITIES, type CatalogOwnership, type CatalogSort, type Rarity } from "@wikideck/shared";

export type CatalogViewState = {
  page?: number;
  sort?: CatalogSort;
  ownership?: CatalogOwnership;
  rarities?: Rarity[];
  query?: string;
};

export function catalogHref({ page, sort, ownership, rarities, query }: CatalogViewState) {
  const qs = new URLSearchParams();
  if (query) qs.set("q", query);
  if (sort && sort !== "rarity_desc") qs.set("sort", sort);
  if (ownership && ownership !== "all") qs.set("show", ownership);
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
  return s ? `/cards?${s}` : "/cards";
}
