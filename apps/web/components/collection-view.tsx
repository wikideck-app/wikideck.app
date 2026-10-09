"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Recycle,
  Search,
  Star,
  StarFill,
  X,
} from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  COLLECTION_SEARCH_MAX,
  COLLECTION_SORTS,
  RARITIES,
  type CollectionCard,
  type CollectionResponse,
  type CollectionSort,
  type PackKind,
  type Rarity,
} from "@wikideck/shared";
import { CardDetail } from "@/components/card-detail";
import { SellDialog } from "@/components/market/sell-dialog";
import { CollectionBulkPanel } from "@/components/collection-bulk-panel";
import { RecycleDuplicatesDialog } from "@/components/recycle-duplicates-dialog";
import { RecycleDialog, recycleTotal, type RecycleLine } from "@/components/recycle-dialog";
import { buttonClass, dangerButtonClass } from "@/components/settings/controls";
import { Wikibits } from "@/components/wikibit";
import { SelectMenu } from "@/components/select-menu";
import { ManageTags } from "@/components/manage-tags";
import { TagChip } from "@/components/tag-chip";
import { TagEditor } from "@/components/tag-editor";
import { WikiCard } from "@/components/wiki-card";
import { useRarityLabel } from "@/lib/labels";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { apiCall } from "@/lib/tags-api";

type View = {
  page?: number;
  sort?: CollectionSort;
  tag?: string | null;
  rarities?: Rarity[];
  q?: string;
  fav?: boolean;
  source?: PackKind | null;
};

function href({ page, sort, tag, rarities, q, fav, source }: View) {
  const qs = new URLSearchParams();
  if (source === "anime") qs.set("source", "anime");
  if (fav) qs.set("fav", "1");
  if (q) qs.set("q", q);
  if (sort) qs.set("sort", sort);
  if (tag) qs.set("tag", tag);
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
  return s ? `/collection?${s}` : "/collection";
}

const circle =
  "flex size-11 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/15";

export function CollectionView({ data, apiUrl }: { data: CollectionResponse; apiUrl: string }) {
  const t = useTranslations("collection");
  const tc = useTranslations("common");
  const ts = useTranslations("cards.sorts");
  const tCards = useTranslations("cards");
  const rarityLabel = useRarityLabel();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<Map<string, CollectionCard>>(new Map());
  const [recycleLines, setRecycleLines] = useState<RecycleLine[] | null>(null);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const selected = data.cards.find((c) => c.id === selectedId) ?? null;

  // on affiche l'étoile tout de suite sans attendre le refresh
  const [favOverride, setFavOverride] = useState<Record<string, boolean>>({});
  const isFavorite = (card: CollectionCard) => favOverride[card.id] ?? card.favorite ?? false;
  const [starBusy, setStarBusy] = useState(false);
  const [starError, setStarError] = useState<string | null>(null);
  async function toggleStar(card: CollectionCard) {
    const favorite = !isFavorite(card);
    setStarBusy(true);
    setStarError(null);
    const res = await apiCall(apiUrl, `/collection/${card.id}/favorite`, "PUT", { favorite });
    setStarBusy(false);
    if (!res.ok) return setStarError(res.message);
    setFavOverride((prev) => ({ ...prev, [card.id]: favorite }));
  }
  const base = {
    sort: data.sort,
    tag: data.tag,
    rarities: data.rarities,
    q: data.query,
    fav: data.favoritesOnly,
    source: data.source,
  };
  const filtering = data.rarities.length > 0;

  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(data.query);
  const lastSent = useRef(data.query);

  useEffect(() => {
    if (search === lastSent.current) return;
    // pause dans la frappe avant de changer l'url
    const id = setTimeout(() => {
      lastSent.current = search.trim();
      startTransition(() => router.replace(href({ ...base, q: lastSent.current })));
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

  const togglePick = (card: CollectionCard) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.set(card.id, card);
      return next;
    });
  const exitSelect = () => {
    setSelectMode(false);
    setPicked(new Map());
  };
  const pickedLines: RecycleLine[] = [...picked.values()].map((card) => ({
    card,
    quantity: card.quantity,
  }));
  const pickedTotal = recycleTotal(pickedLines);
  const pickedCopies = pickedLines.reduce((n, l) => n + l.quantity, 0);

  useEffect(() => {
    if (!selectMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) exitSelect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectMode]);

  return (
    <>
      {bulkOpen && (
        <CollectionBulkPanel
          apiUrl={apiUrl}
          pageCardIds={data.cards.map((c) => c.id)}
          onDuplicates={() => setDuplicatesOpen(true)}
          onDone={() => router.refresh()}
        />
      )}

      <div
        role="tablist"
        aria-label={t("sourceLabel")}
        className="mx-auto mt-8 flex w-fit gap-1 rounded-2xl border border-line p-1"
      >
        {(["wikipedia", "anime"] as const).map((k) => (
          <Link
            key={k}
            role="tab"
            aria-selected={data.source === k}
            href={href({ ...base, tag: null, rarities: [], q: "", source: k })}
            className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
              data.source === k ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
            }`}
          >
            {t(`sources.${k}`)}{" "}
            <span className="tabular-nums opacity-70">{data.sourceCounts[k]}</span>
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
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-9 text-sm outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            aria-label={t("clearSearch")}
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav aria-label={tCards("filterByRarity")} className="mt-4 flex flex-wrap items-center gap-1">
        <Link
          href={href({
            sort: data.sort,
            tag: data.tag,
            rarities: data.rarities,
            q: data.query,
            fav: !data.favoritesOnly,
            source: data.source,
          })}
          aria-pressed={data.favoritesOnly}
          className="mr-2 flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-bold transition hover:bg-foreground/10 aria-pressed:border-amber-300 aria-pressed:bg-amber-300/15 aria-pressed:text-amber-300"
        >
          {data.favoritesOnly ? <StarFill className="size-4" /> : <Star className="size-4" />}
          {t("favorites")}
        </Link>
        {[...RARITIES].reverse().map((r) => {
          const active = data.rarities.includes(r.value);
          const next = active
            ? data.rarities.filter((v) => v !== r.value)
            : [...data.rarities, r.value];
          return (
            <Link
              key={r.value}
              href={href({
                sort: data.sort,
                tag: data.tag,
                rarities: next,
                q: data.query,
                fav: data.favoritesOnly,
    source: data.source,
              })}
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
            href={href({ sort: data.sort, tag: data.tag, q: data.query, fav: data.favoritesOnly, source: data.source })}
            className="ml-2 text-xs opacity-60 hover:opacity-100"
          >
            {tCards("resetFilters")}
          </Link>
        )}
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={href({
              sort: data.sort,
              rarities: data.rarities,
              q: data.query,
              fav: data.favoritesOnly,
    source: data.source,
            })}
            aria-current={!data.tag}
            className="rounded-full px-3 py-1 text-xs font-semibold aria-current:bg-foreground aria-current:text-background bg-foreground/10"
          >
            {t("allTags")}
          </Link>
          {data.tags.map((tag) => (
            <Link
              key={tag.id}
              href={href({
                sort: data.sort,
                tag: tag.id,
                rarities: data.rarities,
                q: data.query,
                fav: data.favoritesOnly,
    source: data.source,
              })}
              aria-current={data.tag === tag.id}
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <TagChip
                tag={{ name: `${tag.name} · ${tag.count}`, color: tag.color }}
                active={data.tag === tag.id}
              />
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-60">{tCards("sort")}</span>
            <SelectMenu
              label={t("sortLabel")}
              value={data.sort}
              options={COLLECTION_SORTS.map((s) => ({ value: s.value, label: ts(s.value) }))}
              onChange={(sort) =>
                router.push(
                  href({
                    sort,
                    tag: data.tag,
                    rarities: data.rarities,
                    q: data.query,
                    fav: data.favoritesOnly,
    source: data.source,
                  }),
                )
              }
            />
          </div>
          <button
            type="button"
            aria-pressed={selectMode}
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            className={`${buttonClass} py-1.5! ${selectMode ? "bg-accent! text-accent-foreground!" : ""}`}
          >
            <Recycle className="size-4" /> {selectMode ? t("recycleModeDone") : t("recycleMode")}
          </button>
          <button
            type="button"
            aria-expanded={bulkOpen}
            onClick={() => setBulkOpen((o) => !o)}
            className={`${buttonClass} py-1.5! ${bulkOpen ? "bg-accent! text-accent-foreground!" : ""}`}
          >
            <Recycle className="size-4" /> {t("bulkRecycle")}
          </button>
          <ManageTags apiUrl={apiUrl} tags={data.tags} />
        </div>
      </div>

      {starError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {starError}
        </p>
      )}

      {data.cards.length === 0 ? (
        <p className="mt-10 text-center opacity-60">{t("empty")}</p>
      ) : (
        <div
          className={`mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 ${isPending ? "opacity-60" : ""}`}
        >
          {data.cards.map((card) => {
            const isPicked = picked.has(card.id);
            const open = () => (selectMode ? togglePick(card) : setSelectedId(card.id));
            return (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                aria-label={t(selectMode ? "select" : "view", { title: card.title })}
                aria-pressed={selectMode ? isPicked : undefined}
                onClick={(e) => !(e.target as HTMLElement).closest("a, [data-star]") && open()}
                onKeyDown={(e) => (e.key === "Enter" || (selectMode && e.key === " ")) && open()}
                className={`cv-item relative cursor-pointer rounded-[9.6%/6.5%] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent ${
                  isPicked ? "ring-4 ring-accent ring-offset-2 ring-offset-background" : ""
                } ${selectMode && !isPicked ? "opacity-80 hover:opacity-100" : ""}`}
              >
                <WikiCard
                  card={card}
                  quantity={card.quantity}
                  tags={card.tags}
                  inAlbum={card.inAlbum && !selectMode}
                  compact
                />
                {bulkOpen && !selectMode && (card.protectedReason || card.estimate) && (
                  <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex flex-col items-start gap-1 text-[11px] font-semibold">
                    {card.protectedReason && (
                      <span className="max-w-full truncate rounded-full bg-black/75 px-2 py-0.5 text-white">
                        {t("protectedBadge", { reason: card.protectedReason })}
                      </span>
                    )}
                    {card.estimate ? (
                      <span className="rounded-full bg-black/75 px-2 py-0.5 text-white">
                        {t("estimate", { amount: card.estimate })}
                      </span>
                    ) : null}
                  </span>
                )}
                {!selectMode && (
                  <button
                    type="button"
                    data-star
                    disabled={starBusy}
                    aria-pressed={isFavorite(card)}
                    aria-label={t(isFavorite(card) ? "unfavorite" : "favorite", { title: card.title })}
                    title={t(isFavorite(card) ? "unfavoriteShort" : "favoriteShort")}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleStar(card);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className={`absolute right-1.5 top-1.5 z-10 flex size-8 items-center justify-center rounded-full bg-black/55 shadow transition hover:scale-110 hover:bg-black/75 disabled:opacity-60 ${
                      isFavorite(card) ? "text-amber-300" : "text-white/80 hover:text-amber-200"
                    }`}
                  >
                    {isFavorite(card) ? (
                      <StarFill className="size-5" />
                    ) : (
                      <Star className="size-5" />
                    )}
                  </button>
                )}
                {selectMode && (
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute left-2 top-2 flex size-7 items-center justify-center rounded-full border-2 shadow ${
                      isPicked
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-white/80 bg-black/40 text-transparent"
                    }`}
                  >
                    <Check className="size-4" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data.totalPages > 1 && (
        <nav aria-label={tc("pagination.label")} className="mt-10 flex items-center justify-center gap-4">
          {data.page > 1 ? (
            <Link
              href={href({ ...base, page: data.page - 1 })}
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
              href={href({ ...base, page: data.page + 1 })}
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
          quantity={selected.quantity}
          apiUrl={apiUrl}
          onClose={() => {
            setSelectedId(null);
            setSelling(false);
          }}
          onSell={() => setSelling(true)}
          onRecycle={() => setRecycleLines([{ card: selected, quantity: 1 }])}
        >
          <TagEditor
            apiUrl={apiUrl}
            cardId={selected.id}
            cardTags={selected.tags}
            allTags={data.tags}
          />
        </CardDetail>
      )}

      {selectMode && (
        <div
          role="region"
          aria-label={t("selection.label")}
          className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface px-5 py-3 shadow-2xl"
        >
          <span className="text-sm font-semibold">
            {picked.size === 0
              ? t("selection.none")
              : t("selection.count", { count: picked.size })}
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <button
              type="button"
              className="underline hover:text-accent"
              onClick={() => setPicked(new Map(data.cards.map((c) => [c.id, c])))}
            >
              {t("selection.page")}
            </button>
            {picked.size > 0 && (
              <button
                type="button"
                className="underline hover:text-accent"
                onClick={() => setPicked(new Map())}
              >
                {t("selection.clear")}
              </button>
            )}
          </div>
          <button
            type="button"
            className={dangerButtonClass}
            disabled={pickedCopies === 0}
            onClick={() => setRecycleLines(pickedLines)}
          >
            <Recycle className="size-4" />
            {pickedCopies === 0 ? t("selection.recycle") : t("selection.recycleCount", { count: pickedCopies })}
            {pickedCopies > 0 && (
              <span className="inline-flex items-center gap-1 opacity-90">
                (+
                <Wikibits amount={pickedTotal} />)
              </span>
            )}
          </button>
        </div>
      )}

      {duplicatesOpen && (
        <RecycleDuplicatesDialog
          apiUrl={apiUrl}
          onClose={() => setDuplicatesOpen(false)}
          onDone={() => router.refresh()}
        />
      )}

      {recycleLines && (
        <RecycleDialog
          apiUrl={apiUrl}
          lines={recycleLines}
          onClose={() => setRecycleLines(null)}
          onDone={() => {
            setPicked(new Map());
            router.refresh();
          }}
        />
      )}

      {selected && selling && (
        <SellDialog
          apiUrl={apiUrl}
          initialCard={selected}
          onClose={() => setSelling(false)}
          onListed={() => router.refresh()}
        />
      )}
    </>
  );
}
