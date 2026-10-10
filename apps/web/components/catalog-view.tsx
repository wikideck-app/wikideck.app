"use client";

import { ChevronLeft, ChevronRight, Search, X } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  CATALOG_OWNERSHIP,
  CATALOG_SORTS,
  COLLECTION_SEARCH_MAX,
  DROP_RARITIES,
  type CatalogResponse,
  type CatalogSort,
} from "@wikideck/shared";
import { CardDetail } from "@/components/card-detail";
import { WikiCard } from "@/components/wiki-card";
import { catalogHref, type CatalogViewState as View } from "@/lib/catalog-href";
import { useRarityLabel } from "@/lib/labels";
import { RARITY_COLOR } from "@/lib/rarity-ui";

const circle =
  "flex size-11 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/15";

export function CatalogView({ data, apiUrl }: { data: CatalogResponse; apiUrl: string }) {
  const t = useTranslations("cards");
  const tc = useTranslations("common");
  const rarityLabel = useRarityLabel();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.cards.find((c) => c.id === selectedId) ?? null;
  const base: View = {
    sort: data.sort,
    ownership: data.ownership,
    rarities: data.rarities,
    query: data.query,
    source: data.source,
  };
  const filtering = data.rarities.length > 0;

  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(data.query);
  const lastSent = useRef(data.query);

  useEffect(() => {
    if (search === lastSent.current) return;
    const id = setTimeout(() => {
      lastSent.current = search.trim();
      startTransition(() => router.replace(catalogHref({ ...base, query: lastSent.current })));
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (data.query !== lastSent.current) {
      lastSent.current = data.query;
      setSearch(data.query);
    }
  }, [data.query]);

  return (
    <>
      <div
        role="tablist"
        aria-label={t("catalog.sourceLabel")}
        className="mx-auto mt-8 flex w-fit gap-1 rounded-2xl border border-line p-1"
      >
        {(["wikipedia", "anime"] as const).map((k) => (
          <Link
            key={k}
            role="tab"
            aria-selected={data.source === k}
            href={catalogHref({ sort: data.sort, ownership: data.ownership, source: k })}
            className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
              data.source === k ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
            }`}
          >
            {t(`catalog.sources.${k}`)}
          </Link>
        ))}
      </div>

      <div className="relative mt-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
        <input
          type="search"
          value={search}
          maxLength={COLLECTION_SEARCH_MAX}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("catalog.searchPlaceholder")}
          aria-label={t("catalog.searchLabel")}
          className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-9 text-sm outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            aria-label={t("catalog.clearSearch")}
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav aria-label={t("filterByRarity")} className="mt-4 flex flex-wrap items-center gap-1">
        {[...DROP_RARITIES].reverse().map((r) => {
          const active = data.rarities.includes(r.value);
          const next = active
            ? data.rarities.filter((v) => v !== r.value)
            : [...data.rarities, r.value];
          return (
            <Link
              key={r.value}
              href={catalogHref({ ...base, rarities: next, page: 1 })}
              title={rarityLabel(r.value)}
              aria-pressed={active}
              style={{ color: RARITY_COLOR[r.value] }}
              className={`min-w-11 rounded-full px-3 py-1.5 text-center text-sm font-bold transition hover:bg-foreground/10 aria-pressed:bg-foreground/15 ${
                filtering && !active ? "opacity-40" : ""
              }`}
            >
              {r.code}
            </Link>
          );
        })}
        {filtering && (
          <Link
            href={catalogHref({ ...base, rarities: [] })}
            className="ml-2 text-xs opacity-60 hover:opacity-100"
          >
            {t("resetFilters")}
          </Link>
        )}
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATALOG_OWNERSHIP.map((o) => (
            <Link
              key={o.value}
              href={catalogHref({ ...base, ownership: o.value })}
              aria-current={data.ownership === o.value}
              className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold aria-current:bg-foreground aria-current:text-background"
            >
              {t(`ownership.${o.value}`)}
            </Link>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="opacity-60">{t("sort")}</span>
          <select
            value={data.sort}
            onChange={(e) =>
              router.push(catalogHref({ ...base, sort: e.target.value as CatalogSort }))
            }
            className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
          >
            {CATALOG_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {t(`sorts.${s.value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-4 text-sm opacity-60">
        {t("catalog.total", { count: data.total })}
      </p>

      {data.cards.length === 0 ? (
        <p className="mt-10 text-center opacity-60">{t("catalog.empty")}</p>
      ) : (
        <div
          className={`mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 ${isPending ? "opacity-60" : ""}`}
        >
          {data.cards.map((card) => (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              aria-label={t("catalog.view", { title: card.title })}
              onClick={(e) => !(e.target as HTMLElement).closest("a") && setSelectedId(card.id)}
              onKeyDown={(e) => e.key === "Enter" && setSelectedId(card.id)}
              className="cv-item cursor-pointer rounded-[9.6%/6.5%] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div
                className={
                  card.mine === 0 ? "opacity-45 saturate-50 transition hover:opacity-90" : ""
                }
              >
                <WikiCard card={card} quantity={card.mine} compact />
              </div>
              <p className="mt-1.5 text-center text-[11px] text-fog">
                {t("catalog.owners", { count: card.owners })}
              </p>
            </div>
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <nav aria-label={tc("pagination.label")} className="mt-10 flex items-center justify-center gap-4">
          {data.page > 1 ? (
            <Link
              href={catalogHref({ ...base, page: data.page - 1 })}
              aria-label={tc("pagination.previous")}
              className={circle}
            >
              <ChevronLeft />
            </Link>
          ) : (
            <span className={`${circle} opacity-30`}>
              <ChevronLeft />
            </span>
          )}
          <span className="text-sm opacity-70">
            {tc.rich("pagination.page", {
              page: data.page,
              total: data.totalPages,
              strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
            })}
          </span>
          {data.page < data.totalPages ? (
            <Link
              href={catalogHref({ ...base, page: data.page + 1 })}
              aria-label={tc("pagination.next")}
              className={circle}
            >
              <ChevronRight />
            </Link>
          ) : (
            <span className={`${circle} opacity-30`}>
              <ChevronRight />
            </span>
          )}
        </nav>
      )}

      {selected && (
        <CardDetail
          card={selected}
          quantity={selected.mine}
          apiUrl={apiUrl}
          onClose={() => setSelectedId(null)}
        >
          <p className="mt-3 text-sm text-pale-mist">
            {t("catalog.ownedBy", { count: selected.owners })}
            {selected.mine === 0 && t("catalog.youMiss")}
          </p>
        </CardDetail>
      )}
    </>
  );
}
