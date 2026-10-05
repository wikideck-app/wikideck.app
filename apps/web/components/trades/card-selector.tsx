"use client";

import { Minus, Plus, Search } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { TRADE_MAX_CARDS, type CollectionCard, type CollectionResponse } from "@wikideck/shared";
import { WikiCard } from "@/components/wiki-card";
import { apiFetch } from "@/lib/tags-api";
import { buttonClass } from "@/components/settings/controls";

export type Selection = Map<string, { card: CollectionCard; quantity: number }>;

export function CardSelector({
  apiUrl,
  endpoint,
  selection,
  onChange,
}: {
  apiUrl: string;
  endpoint: string;
  selection: Selection;
  onChange: (next: Selection) => void;
}) {
  const [query, setQuery] = useState("");
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
        const params = new URLSearchParams({ sort: "rarity_desc", page: String(page) });
        if (query.trim()) params.set("q", query.trim());
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
  }, [apiUrl, endpoint, query, page]);

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
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Rechercher une carte…"
          aria-label="Rechercher une carte"
          className="w-full rounded-[20px] border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 max-h-[42vh] overflow-y-auto pr-1">
        {!loading && cards.length === 0 && !error ? (
          <p className="py-8 text-center text-sm text-fog">Aucune carte.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {cards.map((card) => {
              const chosen = selection.get(card.id);
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    onClick={() => toggle(card)}
                    aria-pressed={!!chosen}
                    aria-label={`${chosen ? "Retirer" : "Choisir"} ${card.title}`}
                    className={`block w-full rounded-[9.6%/6.5%] text-left outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
                      chosen ? "ring-2 ring-accent" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <WikiCard card={card} quantity={card.quantity} compact />
                  </button>
                  {chosen && card.quantity > 1 && (
                    <div className="mt-1.5 flex items-center justify-center gap-2 text-sm">
                      <button
                        type="button"
                        aria-label="Moins"
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
                        aria-label="Plus"
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
        {loading && <p className="py-4 text-center text-sm text-fog">Chargement…</p>}
        {!loading && page < totalPages && (
          <div className="mt-4 text-center">
            <button type="button" className={buttonClass} onClick={() => setPage((p) => p + 1)}>
              Charger plus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
