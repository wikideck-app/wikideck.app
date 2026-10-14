"use client";

import { Minus, Plus, Search } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  COLLECTION_SORTS,
  RARITIES,
  TRADE_MAX_CARDS,
  type CollectionCard,
  type CollectionResponse,
  type CollectionSort,
  type Rarity,
} from "@wikideck/shared";
import { OwnedDot } from "@/components/owned-badge";
import { SelectMenu } from "@/components/select-menu";
import { WikiCard } from "@/components/wiki-card";
import { apiFetch } from "@/lib/tags-api";
import { buttonClass } from "@/components/settings/controls";

type Density = "large" | "medium" | "small";
const DENSITY_KEY = "wd-trade-density";
// cartes par ligne : grandes (2), moyennes (3) ou petites (4 à 5)
const GRID: Record<Density, string> = {
  large: "grid-cols-2",
  medium: "grid-cols-2 sm:grid-cols-3",
  small: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
};

// taille choisie, retenue d'une visite à l'autre (lue après l'hydratation : pas d'écart entre serveur et navigateur)
const densityListeners = new Set<() => void>();
const readDensity = (): Density | null => {
  try {
    const saved = localStorage.getItem(DENSITY_KEY);
    return saved === "large" || saved === "medium" || saved === "small" ? saved : null;
  } catch {
    return null;
  }
};
function useDensity(fallback: Density) {
  const saved = useSyncExternalStore(
    (listener) => {
      densityListeners.add(listener);
      return () => void densityListeners.delete(listener);
    },
    readDensity,
    () => null,
  );
  const set = (next: Density) => {
    try {
      localStorage.setItem(DENSITY_KEY, next);
    } catch {
      /* stockage indisponible */
    }
    densityListeners.forEach((l) => l());
  };
  return [saved ?? fallback, set] as const;
}

export type Selection = Map<string, { card: CollectionCard; quantity: number }>;

export function CardSelector({
  apiUrl,
  endpoint,
  selection,
  onChange,
  tone = "accent",
  listClassName = "max-h-[42vh]",
  extraParams,
  ownedLabel,
  defaultDensity = "medium",
}: {
  apiUrl: string;
  endpoint: string;
  selection: Selection;
  onChange: (next: Selection) => void;
  /** couleur de la sélection : donne (bleu) ou demande (accent) */
  tone?: "accent" | "blue";
  /** hauteur de la zone défilante */
  listClassName?: string;
  /** paramètres d'URL en plus (ex. with=<joueur> : savoir ce que l'autre joueur possède déjà) */
  extraParams?: Record<string, string>;
  /** texte du bandeau « déjà possédée » d'une carte ; null : pas de bandeau */
  ownedLabel?: (card: CollectionCard) => string | null;
  /** taille des cartes au départ (le joueur peut la changer, son choix est gardé) */
  defaultDensity?: Density;
}) {
  const t = useTranslations("trades.selector");
  const ts = useTranslations("cards.sorts");
  const tc = useTranslations("common");
  const [sort, setSort] = useState<CollectionSort>("rarity_desc");
  const [density, setDensity] = useDensity(defaultDensity);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | "wikipedia" | "anime">("all");
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [page, setPage] = useState(1);
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        const params = new URLSearchParams({ sort, page: String(page), ...extraParams });
        if (query.trim()) params.set("q", query.trim());
        if (source !== "all") params.set("source", source);
        if (rarities.length)
          params.set(
            "rarity",
            RARITIES.filter((r) => rarities.includes(r.value))
              .map((r) => r.code)
              .join(","),
          );
        const result = await apiFetch<CollectionResponse>(apiUrl, `${endpoint}?${params}`);
        if (id !== requestId.current) return;
        if (!result.ok) {
          setError(result.message);
        } else {
          setError(null);
          setTotalPages(result.data.totalPages);
          setCards((prev) => (page === 1 ? result.data.cards : [...prev, ...result.data.cards]));
        }
        setLoading(false);
      },
      page === 1 && query ? 300 : 0,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, endpoint, query, source, rarities, sort, page, JSON.stringify(extraParams ?? {})]);

  function toggle(card: CollectionCard) {
    const next = new Map(selection);
    if (next.has(card.id)) next.delete(card.id);
    else if (next.size < TRADE_MAX_CARDS) next.set(card.id, { card, quantity: 1 });
    onChange(next);
  }

  function setQuantity(card: CollectionCard, quantity: number) {
    const next = new Map(selection);
    next.set(card.id, { card, quantity: Math.min(card.quantity, Math.max(1, quantity)) });
    onChange(next);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div role="tablist" aria-label={t("sourceLabel")} className="flex w-fit gap-1 rounded-2xl border border-line p-1">
        {(["all", "wikipedia", "anime"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={source === k}
            onClick={() => {
              setSource(k);
              setPage(1);
            }}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
              source === k ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
            }`}
          >
            {t(`sources.${k}`)}
          </button>
        ))}
      </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label={t("rarityLabel")}>
        {[...RARITIES].reverse().map((r) => {
          const active = rarities.includes(r.value);
          return (
            <button
              key={r.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setRarities((prev) =>
                  prev.includes(r.value) ? prev.filter((v) => v !== r.value) : [...prev, r.value],
                );
                setPage(1);
              }}
              className={`min-w-9 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                active ? "bg-accent text-accent-foreground" : "bg-foreground/10 hover:bg-foreground/15"
              }`}
            >
              {r.code}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-40 max-w-xs flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
        />
      </div>
      <div role="group" aria-label={t("density.label")} className="flex gap-0.5 rounded-full border border-line p-0.5">
        {(["large", "medium", "small"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={density === d}
            onClick={() => setDensity(d)}
            title={t("density.label")}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
              density === d ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
            }`}
          >
            {t(`density.${d}`)}
          </button>
        ))}
      </div>
      <SelectMenu
        label={t("sortLabel")}
        value={sort}
        options={COLLECTION_SORTS.map((s) => ({ value: s.value, label: ts(s.value) }))}
        onChange={(next) => {
          setSort(next);
          setPage(1);
        }}
      />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className={`mt-4 overflow-y-auto p-2 pr-3 ${listClassName}`}>
        {!loading && cards.length === 0 && !error ? (
          <p className="py-8 text-center text-sm text-fog">{t("empty")}</p>
        ) : (
          <ul className={`no-glow grid gap-4 ${GRID[density]}`}>
            {cards.map((card) => {
              const chosen = selection.get(card.id);
              return (
                <li key={card.id}>
                  <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggle(card)}
                    aria-pressed={!!chosen}
                    aria-label={t(chosen ? "remove" : "choose", { title: card.title })}
                    className={`block w-full rounded-[9.6%/6.5%] text-left outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
                      chosen
                        ? tone === "blue"
                          ? "ring-2 ring-tag-blue"
                          : "ring-2 ring-accent"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <WikiCard card={card} quantity={card.quantity} compact />
                  </button>
                  {(() => {
                    const label = ownedLabel?.(card);
                    return label ? <OwnedDot label={label} /> : null;
                  })()}
                  </div>
                  {chosen && card.quantity > 1 && (
                    <div className="mt-1.5 flex items-center justify-center gap-2 text-sm">
                      <button
                        type="button"
                        aria-label={t("less")}
                        onClick={() => setQuantity(card, chosen.quantity - 1)}
                        className="rounded-full border border-line p-1 hover:border-accent"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="min-w-8 text-center font-bold tabular-nums">
                        {chosen.quantity}/{card.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={t("more")}
                        onClick={() => setQuantity(card, chosen.quantity + 1)}
                        className="rounded-full border border-line p-1 hover:border-accent"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {loading && <p className="py-4 text-center text-sm text-fog">{tc("loading")}</p>}
        {!loading && page < totalPages && (
          <div className="mt-4 text-center">
            <button type="button" className={buttonClass} onClick={() => setPage((p) => p + 1)}>
              {tc("loadMore")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
