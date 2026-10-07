"use client";

import { Check, Search, X } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  ALBUM_ADD_BATCH,
  RARITIES,
  type AlbumCandidatesResponse,
  type CollectionCard,
} from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { useRarityLabel } from "@/lib/labels";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { apiCall, apiFetch } from "@/lib/tags-api";

export function AlbumAddDialog({
  albumId,
  apiUrl,
  onClose,
  onDone,
}: {
  albumId: string;
  apiUrl: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("albums.addDialog");
  const tAlbums = useTranslations("albums");
  const tc = useTranslations("common");
  const rarityLabel = useRarityLabel();
  const [search, setSearch] = useState("");
  const [rarities, setRarities] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AlbumCandidatesResponse | null>(null);
  const [picked, setPicked] = useState<Map<string, CollectionCard>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    const qs = new URLSearchParams({ page: String(page) });
    if (search.trim()) qs.set("q", search.trim());
    if (rarities.length) qs.set("rarity", rarities.join(","));
    const timer = setTimeout(
      async () => {
        const res = await apiFetch<AlbumCandidatesResponse>(
          apiUrl,
          `/albums/${albumId}/candidates?${qs}`,
        );
        if (id === request.current && res.ok) setData(res.data);
      },
      search ? 250 : 0,
    );
    return () => clearTimeout(timer);
  }, [apiUrl, albumId, search, rarities, page]);

  const room = data?.room ?? 0;
  const full = picked.size >= room;

  const toggle = (card: CollectionCard) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(card.id)) next.delete(card.id);
      else if (next.size < room) next.set(card.id, card);
      return next;
    });

  const selectPage = () =>
    setPicked((prev) => {
      const next = new Map(prev);
      for (const c of data?.cards ?? []) if (next.size < room) next.set(c.id, c);
      return next;
    });

  async function add() {
    const ids = [...picked.keys()];
    setBusy(true);
    setError(null);
    for (let i = 0; i < ids.length; i += ALBUM_ADD_BATCH) {
      const res = await apiCall(apiUrl, `/albums/${albumId}/cards`, "PUT", {
        add: ids.slice(i, i + ALBUM_ADD_BATCH),
      });
      if (!res.ok) {
        setBusy(false);
        return setError(res.message);
      }
    }
    setBusy(false);
    onDone();
  }

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto flex max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl flex-col rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
    >
      <button
        type="button"
        aria-label={tc("close")}
        onClick={(e) => e.currentTarget.closest("dialog")?.close()}
        className="absolute right-4 top-4 opacity-60 hover:opacity-100"
      >
        <X className="size-5" />
      </button>
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <p className="mt-1 text-sm text-fog">
        {t("intro", { count: room })}
      </p>

      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={tAlbums("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="w-full rounded-full border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        {[...RARITIES].reverse().map((r) => {
          const active = rarities.includes(r.code);
          return (
            <button
              key={r.value}
              type="button"
              title={rarityLabel(r.value)}
              aria-pressed={active}
              onClick={() => {
                setRarities((prev) =>
                  prev.includes(r.code) ? prev.filter((c) => c !== r.code) : [...prev, r.code],
                );
                setPage(1);
              }}
              style={{ color: RARITY_COLOR[r.value] }}
              className={`min-w-11 rounded-full px-3 py-1.5 text-sm font-bold transition hover:bg-foreground/10 aria-pressed:bg-foreground/15 ${
                rarities.length && !active ? "opacity-40" : ""
              }`}
            >
              {r.code}
            </button>
          );
        })}
        <button
          type="button"
          className="ml-auto text-xs text-fog underline hover:text-foreground"
          disabled={!data?.cards.length}
          onClick={selectPage}
        >
          {t("selectPage")}
        </button>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {!data ? (
          <p className="py-10 text-center text-sm text-fog">{tc("loading")}</p>
        ) : data.cards.length === 0 ? (
          <p className="py-10 text-center text-sm text-fog">
            {data.total === 0 && !search && !rarities.length
              ? t("allIn")
              : t("noMatch")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {data.cards.map((card) => {
              const isPicked = picked.has(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  aria-pressed={isPicked}
                  aria-label={t(isPicked ? "deselect" : "select", { title: card.title })}
                  disabled={!isPicked && full}
                  onClick={() => toggle(card)}
                  className={`relative rounded-[9.6%/6.5%] outline-none transition focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${
                    isPicked ? "ring-4 ring-accent ring-offset-2 ring-offset-surface" : ""
                  }`}
                >
                  <WikiCard card={card} compact />
                  {isPicked && (
                    <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground shadow">
                      <Check className="size-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-fog">
          <button
            type="button"
            className={`${buttonClass} py-1.5!`}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {tc("previous")}
          </button>
          <span>
            {data?.page ?? 1} / {data?.totalPages ?? 1}
          </span>
          <button
            type="button"
            className={`${buttonClass} py-1.5!`}
            disabled={!data || page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {tc("next")}
          </button>
        </div>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={picked.size === 0 || busy}
          onClick={() => void add()}
        >
          {busy ? t("adding") : t("addCount", { count: picked.size })}
        </button>
      </div>
    </dialog>
  );
}
