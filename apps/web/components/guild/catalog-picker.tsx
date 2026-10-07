"use client";

import { Search, X } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { CatalogCard, CatalogResponse } from "@wikideck/shared";
import { buttonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { apiFetch } from "@/lib/tags-api";

export function CatalogPicker({
  apiUrl,
  onSelect,
  onClose,
}: {
  apiUrl: string;
  onSelect: (card: CatalogCard) => void;
  onClose: () => void;
}) {
  const t = useTranslations("guild.catalogPicker");
  const tc = useTranslations("common");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        const params = new URLSearchParams({
          show: "missing",
          sort: "rarity_desc",
          page: String(page),
        });
        if (query.trim()) params.set("q", query.trim());
        const result = await apiFetch<CatalogResponse>(apiUrl, `/cards?${params}`);
        if (id !== requestId.current) return;
        if (!result.ok) setError(result.message);
        else {
          setError(null);
          setTotalPages(result.data.totalPages);
          setCards((prev) => (page === 1 ? result.data.cards : [...prev, ...result.data.cards]));
        }
        setLoading(false);
      },
      page === 1 && query ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [apiUrl, query, page]);

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-4xl rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="mt-1 text-sm text-pale-mist">
            {t("description")}
          </p>
        </div>
        <button
          type="button"
          aria-label={tc("close")}
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          className="opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="relative mt-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t("search")}
          aria-label={t("search")}
          className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
        />
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 max-h-[55vh] overflow-y-auto pr-1">
        {!loading && cards.length === 0 && !error ? (
          <p className="py-10 text-center text-sm text-fog">
            {query.trim() ? t("noMatch") : t("ownAll")}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {cards.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={(e) => {
                    onSelect(card);
                    e.currentTarget.closest("dialog")?.close();
                  }}
                  aria-label={t("wish", { title: card.title })}
                  className="block w-full rounded-[9.6%/6.5%] text-left outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <WikiCard card={card} compact />
                </button>
              </li>
            ))}
          </ul>
        )}
        {loading && <p className="py-6 text-center text-sm text-fog">{tc("loading")}</p>}
        {!loading && page < totalPages && (
          <div className="mt-5 text-center">
            <button type="button" className={buttonClass} onClick={() => setPage((p) => p + 1)}>
              {tc("loadMore")}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
