"use client";

import { ChevronLeft, ChevronRight, LineChart, Plus, Search, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  COLLECTION_SEARCH_MAX,
  MARKET_SORTS,
  RARITIES,
  type MarketResponse,
  type MarketSort,
  type MarketView as View,
} from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { marketHref, type MarketViewState } from "@/lib/market-href";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { AuctionTile } from "./auction-tile";
import { SellDialog } from "./sell-dialog";
import { StatsDialog } from "./stats-dialog";

const TABS: { view: View; label: string }[] = [
  { view: "all", label: "Enchères en cours" },
  { view: "selling", label: "Mes ventes" },
  { view: "bidding", label: "Mes mises" },
];

const EMPTY: Record<View, string> = {
  all: "Aucune enchère en cours pour ces filtres.",
  selling: "Vous n'avez rien mis en vente.",
  bidding: "Vous n'avez pas encore misé.",
};

const circle =
  "flex size-11 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/15";

export function MarketView({ data, apiUrl }: { data: MarketResponse; apiUrl: string }) {
  const router = useRouter();
  const [selling, setSelling] = useState(false);
  const [stats, setStats] = useState(false);
  const base: MarketViewState = {
    view: data.view,
    sort: data.sort,
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
      startTransition(() => router.replace(marketHref({ ...base, query: lastSent.current })));
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
      <div
        role="tablist"
        className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line"
      >
        <div className="flex gap-2">
          {TABS.map((t) => (
            <Link
              key={t.view}
              role="tab"
              aria-selected={data.view === t.view}
              href={marketHref({ ...base, view: t.view, page: 1 })}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
                data.view === t.view
                  ? "border-accent text-foreground"
                  : "border-transparent text-fog hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="mb-2 flex gap-2">
          <button type="button" className={buttonClass} onClick={() => setStats(true)}>
            <LineChart className="size-4" /> Vue du marché
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => setSelling(true)}>
            <Plus className="size-4" /> Mettre en vente
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          <input
            type="search"
            value={search}
            maxLength={COLLECTION_SEARCH_MAX}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une carte…"
            aria-label="Rechercher une carte par nom"
            className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-9 text-sm outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
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

        <nav aria-label="Filtrer par rareté" className="flex flex-wrap items-center gap-1">
          {[...RARITIES].reverse().map((r) => {
            const active = data.rarities.includes(r.value);
            const next = active
              ? data.rarities.filter((v) => v !== r.value)
              : [...data.rarities, r.value];
            return (
              <Link
                key={r.value}
                href={marketHref({ ...base, rarities: next, page: 1 })}
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
              href={marketHref({ ...base, rarities: [] })}
              className="ml-2 text-xs opacity-60 hover:opacity-100"
            >
              Réinitialiser
            </Link>
          )}
        </nav>

        {data.view === "all" && (
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="opacity-60">Trier</span>
            <select
              value={data.sort}
              onChange={(e) =>
                router.push(marketHref({ ...base, sort: e.target.value as MarketSort }))
              }
              className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
            >
              {MARKET_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {data.auctions.length === 0 ? (
        <p className="mt-14 text-center opacity-60">{EMPTY[data.view]}</p>
      ) : (
        <div
          className={`mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${
            isPending ? "opacity-60" : ""
          }`}
        >
          {data.auctions.map((a) => (
            <AuctionTile key={a.id} auction={a} />
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
          {data.page > 1 ? (
            <Link
              href={marketHref({ ...base, page: data.page - 1 })}
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
              href={marketHref({ ...base, page: data.page + 1 })}
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

      {selling && <SellDialog apiUrl={apiUrl} onClose={() => setSelling(false)} />}
      {stats && <StatsDialog apiUrl={apiUrl} onClose={() => setStats(false)} />}
    </>
  );
}
