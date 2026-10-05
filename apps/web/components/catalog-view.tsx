"use client";

import { ChevronLeft, ChevronRight, Search, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  CATALOG_OWNERSHIP,
  CATALOG_SORTS,
  COLLECTION_SEARCH_MAX,
  RARITIES,
  type CatalogResponse,
  type CatalogSort,
} from "@wikideck/shared";
import { CardDetail } from "@/components/card-detail";
import { WikiCard } from "@/components/wiki-card";
import { catalogHref, type CatalogViewState as View } from "@/lib/catalog-href";
import { RARITY_COLOR } from "@/lib/rarity-ui";

const circle =
  "flex size-11 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/15";

export function CatalogView({ data, apiUrl }: { data: CatalogResponse; apiUrl: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.cards.find((c) => c.id === selectedId) ?? null;
  const base: View = {
    sort: data.sort,
    ownership: data.ownership,
    rarities: data.rarities,
    query: data.query,
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearch(data.query);
    }
  }, [data.query]);

  return (
    <>
      <div className="relative mt-8 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
        <input
          type="search"
          value={search}
          maxLength={COLLECTION_SEARCH_MAX}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une carte par nom…"
          aria-label="Rechercher une carte par nom"
          className="w-full rounded-[20px] border border-line bg-transparent py-2 pl-9 pr-9 text-sm outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav aria-label="Filtrer par rareté" className="mt-4 flex flex-wrap items-center gap-1">
        {[...RARITIES].reverse().map((r) => {
          const active = data.rarities.includes(r.value);
          const next = active
            ? data.rarities.filter((v) => v !== r.value)
            : [...data.rarities, r.value];
          return (
            <Link
              key={r.value}
              href={catalogHref({ ...base, rarities: next, page: 1 })}
              title={r.label}
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
            Réinitialiser
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
              className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold aria-[current=true]:bg-foreground aria-[current=true]:text-background"
            >
              {o.label}
            </Link>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="opacity-60">Trier</span>
          <select
            value={data.sort}
            onChange={(e) =>
              router.push(catalogHref({ ...base, sort: e.target.value as CatalogSort }))
            }
            className="rounded-[20px] border border-line bg-background px-2 py-1.5 text-sm"
          >
            {CATALOG_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-4 text-sm opacity-60">
        {new Intl.NumberFormat("fr-FR").format(data.total)} carte{data.total > 1 ? "s" : ""}
      </p>

      {data.cards.length === 0 ? (
        <p className="mt-10 text-center opacity-60">Aucune carte ne correspond à ces filtres.</p>
      ) : (
        <div
          className={`mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 ${isPending ? "opacity-60" : ""}`}
        >
          {data.cards.map((card) => (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              aria-label={`Voir ${card.title}`}
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
                {card.owners === 0
                  ? "Jamais tirée"
                  : `${card.owners} joueur${card.owners > 1 ? "s" : ""}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
          {data.page > 1 ? (
            <Link
              href={catalogHref({ ...base, page: data.page - 1 })}
              aria-label="Page précédente"
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
            Page <strong className="text-foreground">{data.page}</strong> / {data.totalPages}
          </span>
          {data.page < data.totalPages ? (
            <Link
              href={catalogHref({ ...base, page: data.page + 1 })}
              aria-label="Page suivante"
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
            {selected.owners === 0
              ? "Aucun joueur ne la possède pour l'instant"
              : `Possédée par ${selected.owners} joueur${selected.owners > 1 ? "s" : ""}`}
            {selected.mine === 0 && " · il vous manque cette carte"}
          </p>
        </CardDetail>
      )}
    </>
  );
}
