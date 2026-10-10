"use client";

import { ChevronLeft, ChevronRight, LineChart, Plus, Search, X } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { useRarityLabel } from "@/lib/labels";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { AuctionTile } from "./auction-tile";
import { SellDialog } from "./sell-dialog";
import { StatsDialog } from "./stats-dialog";

const TABS: View[] = ["all", "selling", "bidding"];

const circle =
  "flex size-11 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/15";

export function MarketView({ data, apiUrl }: { data: MarketResponse; apiUrl: string }) {
  const t = useTranslations("market");
  const tc = useTranslations("common");
  const tCards = useTranslations("cards");
  const rarityLabel = useRarityLabel();
  const router = useRouter();
  const [selling, setSelling] = useState(false);
  const [stats, setStats] = useState(false);
  const base: MarketViewState = {
    view: data.view,
    sort: data.sort,
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
      startTransition(() => router.replace(marketHref({ ...base, query: lastSent.current })));
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
        className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line"
      >
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <Link
              key={tab}
              role="tab"
              aria-selected={data.view === tab}
              href={marketHref({ ...base, view: tab, page: 1 })}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
                data.view === tab
                  ? "border-accent text-foreground"
                  : "border-transparent text-fog hover:text-foreground"
              }`}
            >
              {t(`tabs.${tab}`)}
            </Link>
          ))}
        </div>
        <div className="mb-2 flex gap-2">
          <button type="button" className={buttonClass} onClick={() => setStats(true)}>
            <LineChart className="size-4" /> {t("marketView")}
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => setSelling(true)}>
            <Plus className="size-4" /> {t("sell")}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div
          role="tablist"
          aria-label={t("sourceLabel")}
          className="flex w-fit gap-1 rounded-2xl border border-line p-1"
        >
          {([null, "wikipedia", "anime"] as const).map((k) => (
            <Link
              key={k ?? "all"}
              role="tab"
              aria-selected={data.source === k}
              href={marketHref({ ...base, source: k, page: 1 })}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                data.source === k ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
              }`}
            >
              {t(`sources.${k ?? "all"}`)}
            </Link>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          <input
            type="search"
            value={search}
            maxLength={COLLECTION_SEARCH_MAX}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-9 text-sm outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              aria-label={tCards("catalog.clearSearch")}
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <nav aria-label={tCards("filterByRarity")} className="flex flex-wrap items-center gap-1">
          {[...RARITIES].reverse().map((r) => {
            const active = data.rarities.includes(r.value);
            const next = active
              ? data.rarities.filter((v) => v !== r.value)
              : [...data.rarities, r.value];
            return (
              <Link
                key={r.value}
                href={marketHref({ ...base, rarities: next, page: 1 })}
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
              href={marketHref({ ...base, rarities: [] })}
              className="ml-2 text-xs opacity-60 hover:opacity-100"
            >
              {tCards("resetFilters")}
            </Link>
          )}
        </nav>

        {data.view === "all" && (
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="opacity-60">{tCards("sort")}</span>
            <select
              value={data.sort}
              onChange={(e) =>
                router.push(marketHref({ ...base, sort: e.target.value as MarketSort }))
              }
              className="rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
            >
              {MARKET_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(`sorts.${s.value}`)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {data.auctions.length === 0 ? (
        <p className="mt-14 text-center opacity-60">{t(`empty.${data.view}`)}</p>
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
        <nav aria-label={tc("pagination.label")} className="mt-10 flex items-center justify-center gap-4">
          {data.page > 1 ? (
            <Link
              href={marketHref({ ...base, page: data.page - 1 })}
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
              href={marketHref({ ...base, page: data.page + 1 })}
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

      {selling && <SellDialog apiUrl={apiUrl} onClose={() => setSelling(false)} />}
      {stats && <StatsDialog apiUrl={apiUrl} onClose={() => setStats(false)} />}
    </>
  );
}
