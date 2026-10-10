"use client";

import { ChevronLeft, ChevronRight, Check, Pencil, Plus, Search, Trash2 } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ALBUM_MAX_DEPTH,
  ALBUM_NAME_MAX,
  RARITIES,
  type AlbumResponse,
  type AlbumsResponse,
  type CollectionCard,
} from "@wikideck/shared";
import { ALBUM_DRAG_TYPE, AlbumTile } from "@/components/albums/album-tile";
import { AlbumAddDialog } from "@/components/albums/album-add-dialog";
import { CardDetail } from "@/components/card-detail";
import { useConfirm } from "@/components/confirm-dialog";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { moveTargets } from "@/lib/album-tree";
import { useRarityLabel } from "@/lib/labels";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { apiCall, apiFetch } from "@/lib/tags-api";

function href(
  id: string,
  { q, rarities, page, scope }: { q?: string; rarities?: string[]; page?: number; scope?: "all" },
) {
  const qs = new URLSearchParams();
  if (scope) qs.set("scope", scope);
  if (q) qs.set("q", q);
  if (rarities?.length) qs.set("rarity", rarities.join(","));
  if (page && page > 1) qs.set("page", String(page));
  return `/albums/${id}${qs.size ? `?${qs}` : ""}`;
}

// positions des pièces maîtresses : la plus belle au centre
const STAGE = [
  "z-20 scale-125 -translate-y-2",
  "z-10 -translate-x-[110%] -rotate-6 scale-95",
  "z-10 translate-x-[110%] rotate-6 scale-95",
];

export function AlbumView({ data, apiUrl }: { data: AlbumResponse; apiUrl: string }) {
  const t = useTranslations("albums");
  const tc = useTranslations("common");
  const tCards = useTranslations("cards");
  const rarityLabel = useRarityLabel();
  const router = useRouter();
  const { album } = data;
  const { confirm, dialog: confirmDialog } = useConfirm();
  const renameDialog = useRef<HTMLDialogElement>(null);
  const subDialog = useRef<HTMLDialogElement>(null);
  const moveDialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(album.name);
  const [subName, setSubName] = useState("");
  const [targets, setTargets] = useState<{ id: string; label: string }[] | null>(null);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const scope = data.scope === "all" ? ("all" as const) : undefined;
  const base = {
    q: data.query,
    rarities: data.rarities.map((r) => RARITIES.find((x) => x.value === r)!.code),
    scope,
  };
  const [search, setSearch] = useState(data.query);
  const lastSent = useRef(data.query);
  useEffect(() => {
    if (search === lastSent.current) return;
    // pause dans la frappe avant de changer l'url
    const id = setTimeout(() => {
      lastSent.current = search.trim();
      startTransition(() => router.replace(href(album.id, { ...base, q: lastSent.current })));
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const selected =
    data.cards.find((c) => c.id === selectedId) ??
    data.highlights.find((c) => c.id === selectedId) ??
    null;
  const filtering = data.rarities.length > 0;

  async function toggleProfile() {
    setError(null);
    const res = await apiCall(apiUrl, `/albums/${album.id}`, "PATCH", {
      onProfile: !album.onProfile,
    });
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  async function rename() {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    const res = await apiCall(apiUrl, `/albums/${album.id}`, "PATCH", { name: clean });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    renameDialog.current?.close();
    router.refresh();
  }

  async function createSub() {
    const clean = subName.trim().replace(/\s+/g, " ");
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    const res = await apiCall<{ id: string }>(apiUrl, "/albums", "POST", {
      name: clean,
      parentId: album.id,
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    subDialog.current?.close();
    router.push(`/albums/${res.data.id}`);
  }

  async function openMove() {
    setError(null);
    setTarget(album.parentId ?? "");
    moveDialog.current?.showModal();
    const res = await apiFetch<AlbumsResponse>(apiUrl, "/albums");
    if (res.ok) setTargets(moveTargets(res.data.albums, album.id));
    else setError(res.message);
  }

  async function move() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await apiCall(apiUrl, `/albums/${album.id}`, "PATCH", { parentId: target || null });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    moveDialog.current?.close();
    router.refresh();
  }

  async function remove() {
    const ok = await confirm({
      title: t("delete.title", { name: album.name }),
      message: data.children.length ? t("delete.messageWithChildren") : t("delete.message"),
      confirmLabel: tc("delete"),
      danger: true,
    });
    if (!ok) return;
    const res = await apiCall(apiUrl, `/albums/${album.id}`, "DELETE");
    if (!res.ok) return setError(res.message);
    router.push(album.parentId ? `/albums/${album.parentId}` : "/albums");
  }

  // glisser un sous-album sur un autre l'y range ; le déposer sur le chemin le remonte (ou le sort à la racine)
  async function moveAlbum(draggedId: string, parentId: string | null) {
    setError(null);
    const res = await apiCall(apiUrl, `/albums/${draggedId}`, "PATCH", { parentId });
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  async function takeOut() {
    const ids = [...picked];
    const ok = await confirm({
      title: t("takeOutTitle", { count: ids.length }),
      message: t("takeOutMessage"),
      confirmLabel: t("takeOutConfirm"),
      danger: true,
    });
    if (!ok) return;
    const res = await apiCall(apiUrl, `/albums/${album.id}/cards`, "PUT", { remove: ids });
    if (!res.ok) return setError(res.message);
    setPicked(new Set());
    setSelectMode(false);
    router.refresh();
  }

  const toggle = (card: CollectionCard) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });

  return (
    <div className="mx-auto max-w-5xl">
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t("trailLabel")} className="min-w-0">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-pale-mist">
            {[
              {
                id: "",
                name: data.readOnly ? t("backToProfile", { name: data.owner.username }) : t("back"),
              },
              ...data.trail,
            ].map((step) => (
              <li
                key={step.id || "root"}
                className="flex items-center gap-1"
                onDragOver={(e) => {
                  if (!data.readOnly && e.dataTransfer.types.includes(ALBUM_DRAG_TYPE))
                    e.preventDefault();
                }}
                onDrop={(e) => {
                  const dragged = e.dataTransfer.getData(ALBUM_DRAG_TYPE);
                  if (data.readOnly || !dragged) return;
                  e.preventDefault();
                  void moveAlbum(dragged, step.id || null);
                }}
              >
                <Link
                  href={
                    step.id
                      ? `/albums/${step.id}`
                      : data.readOnly
                        ? `/profile/${data.owner.id}`
                        : "/albums"
                  }
                  className="rounded-md px-1.5 py-0.5 hover:bg-foreground/10 hover:text-foreground"
                >
                  {step.name}
                </Link>
                <ChevronRight className="size-3.5 opacity-50" />
              </li>
            ))}
            <li aria-current="page" className="px-1.5 py-0.5 font-bold text-foreground">
              {album.name}
            </li>
          </ol>
        </nav>
        {!data.readOnly && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={album.onProfile}
              onClick={() => void toggleProfile()}
              className={buttonClass}
            >
              {album.onProfile ? t("profile.hide") : t("profile.show")}
            </button>
            <button type="button" onClick={() => void openMove()} className={buttonClass}>
              {t("move.button")}
            </button>
            <button
              type="button"
              aria-label={t("rename.label")}
              title={t("rename.button")}
              onClick={() => {
                setName(album.name);
                setError(null);
                renameDialog.current?.showModal();
              }}
              className={`${buttonClass} px-3!`}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t("delete.label")}
              title={t("delete.button")}
              onClick={() => void remove()}
              className={`${buttonClass} px-3! text-danger!`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </div>

      <h1 className="mt-6 font-display text-4xl font-medium">{album.name}</h1>
      <p className="text-sm text-fog">
        {data.readOnly
          ? t("ownerLine", { name: data.owner.username, count: data.count })
          : t("mine", { count: data.count })}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <section className="mt-8" aria-label={t("sub.title")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-fog">
            {t("sub.title")}
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] tabular-nums">
              {data.children.length}
            </span>
          </h2>
          {!data.readOnly && data.depth < ALBUM_MAX_DEPTH && (
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setSubName("");
                setError(null);
                subDialog.current?.showModal();
              }}
            >
              <Plus className="size-4" /> {t("sub.new")}
            </button>
          )}
        </div>
        {data.children.length === 0 ? (
          <p className="mt-3 text-sm text-fog">
            {data.readOnly
              ? t("sub.none")
              : data.depth < ALBUM_MAX_DEPTH
                ? t("sub.empty")
                : t("sub.maxDepth", { max: ALBUM_MAX_DEPTH })}
          </p>
        ) : (
          <>
            {!data.readOnly && data.children.length > 1 && (
              <p className="mt-3 text-xs text-fog">{t("dragHintSub")}</p>
            )}
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.children.map((child) => (
                <li key={child.id}>
                  <AlbumTile
                    album={child}
                    onMove={data.readOnly ? undefined : (dragged, target) => void moveAlbum(dragged, target)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {data.highlights.length > 0 && (
        <section className="mt-8" aria-label={t("highlights")}>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-fog">
            {t("highlights")}
          </h2>
          <div className="mt-4 flex h-96 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
            <div className="relative flex w-40 items-center justify-center sm:w-48">
              {data.highlights.map((card, i) => (
                <button
                  key={card.id}
                  type="button"
                  aria-label={t("view", { title: card.title })}
                  onClick={() => setSelectedId(card.id)}
                  className={`absolute w-full transition-transform duration-300 hover:-translate-y-2 ${STAGE[i]}`}
                >
                  <WikiCard card={card} compact />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-fog">
            {t("full")}
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] tabular-nums">
              {data.count}
            </span>
          </h2>
          {!data.readOnly && (
            <div className="flex gap-2">
              <button type="button" className={primaryButtonClass} onClick={() => setAdding(true)}>
                <Plus className="size-4" /> {tc("add")}
              </button>
              {scope !== "all" && (
              <button
                type="button"
                aria-pressed={selectMode}
                disabled={data.total === 0}
                onClick={() => {
                  setSelectMode((s) => !s);
                  setPicked(new Set());
                }}
                className={`${buttonClass} ${selectMode ? "bg-accent! text-accent-foreground!" : ""}`}
              >
                {selectMode ? t("selectDone") : t("select")}
              </button>
              )}
            </div>
          )}
        </div>

        {data.children.length > 0 && (
          <div
            role="group"
            aria-label={t("scope.label")}
            className="mt-4 inline-flex rounded-full border border-line p-0.5"
          >
            {(["own", "all"] as const).map((value) => (
              <Link
                key={value}
                href={href(album.id, {
                  q: data.query,
                  rarities: base.rarities,
                  scope: value === "all" ? "all" : undefined,
                })}
                aria-current={data.scope === value}
                className="rounded-full px-3.5 py-1.5 text-xs font-bold text-pale-mist transition-colors hover:text-foreground aria-current:bg-accent aria-current:text-accent-foreground"
              >
                {t(`scope.${value}`)}
              </Link>
            ))}
          </div>
        )}

        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="w-full rounded-full border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <nav aria-label={tCards("filterByRarity")} className="mt-3 flex flex-wrap items-center gap-1">
          {data.counts.map(({ rarity, count }) => {
            const info = RARITIES.find((r) => r.value === rarity)!;
            const active = data.rarities.includes(rarity);
            const next = (
              active ? data.rarities.filter((v) => v !== rarity) : [...data.rarities, rarity]
            ).map((v) => RARITIES.find((x) => x.value === v)!.code);
            return (
              <Link
                key={rarity}
                href={href(album.id, { q: data.query, rarities: next, scope })}
                title={t("rarityCount", { rarity: rarityLabel(info.value), count })}
                aria-pressed={active}
                style={{ color: RARITY_COLOR[rarity] }}
                className={`flex min-w-11 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition hover:bg-foreground/10 aria-pressed:bg-foreground/15 ${
                  (filtering && !active) || count === 0 ? "opacity-40" : ""
                }`}
              >
                {info.code}
                <span className="text-xs font-normal tabular-nums text-foreground opacity-70">
                  {count}
                </span>
              </Link>
            );
          })}
          {filtering && (
            <Link
              href={href(album.id, { q: data.query, scope })}
              className="ml-2 text-xs opacity-60 hover:opacity-100"
            >
              {tCards("resetFilters")}
            </Link>
          )}
        </nav>

        {data.cards.length === 0 ? (
          <p className="mt-10 text-center opacity-60">
            {data.count === 0 ? t("emptyAlbum") : t("noMatch")}
          </p>
        ) : (
          <div
            className={`mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${isPending ? "opacity-60" : ""}`}
          >
            {data.cards.map((card) => {
              const isPicked = picked.has(card.id);
              return (
                <div key={card.id} className="relative">
                  <button
                    type="button"
                    aria-label={t(selectMode ? "selectCard" : "view", { title: card.title })}
                    aria-pressed={selectMode ? isPicked : undefined}
                    onClick={() => (selectMode ? toggle(card) : setSelectedId(card.id))}
                    className={`block w-full rounded-[9.6%/6.5%] outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent ${
                      isPicked ? "ring-4 ring-accent ring-offset-2 ring-offset-background" : ""
                    }`}
                  >
                    <WikiCard card={card} quantity={card.quantity} compact />
                  </button>
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
          <nav aria-label={tc("pagination.label")} className="mt-8 flex items-center justify-center gap-4">
            {data.page > 1 ? (
              <Link
                href={href(album.id, { ...base, page: data.page - 1 })}
                aria-label={tc("pagination.previous")}
                className={`${buttonClass} px-3!`}
              >
                <ChevronLeft className="size-4" />
              </Link>
            ) : (
              <span className={`${buttonClass} px-3! opacity-30`}>
                <ChevronLeft className="size-4" />
              </span>
            )}
            <span className="text-sm text-fog">
              {data.page} / {data.totalPages}
            </span>
            {data.page < data.totalPages ? (
              <Link
                href={href(album.id, { ...base, page: data.page + 1 })}
                aria-label={tc("pagination.next")}
                className={`${buttonClass} px-3!`}
              >
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className={`${buttonClass} px-3! opacity-30`}>
                <ChevronRight className="size-4" />
              </span>
            )}
          </nav>
        )}
      </section>

      {selectMode && picked.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 border-t border-line bg-surface/95 p-3 backdrop-blur">
          <span className="text-sm">
            {t("selected", { count: picked.size })}
          </span>
          <button type="button" className={dangerButtonClass} onClick={() => void takeOut()}>
            {t("takeOut")}
          </button>
        </div>
      )}

      {adding && (
        <AlbumAddDialog
          albumId={album.id}
          apiUrl={apiUrl}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}

      {selected && (
        <CardDetail
          card={selected}
          quantity={data.readOnly ? 0 : selected.quantity}
          apiUrl={apiUrl}
          onClose={() => {
            setSelectedId(null);
            router.refresh();
          }}
        />
      )}

      <dialog
        ref={subDialog}
        onClick={(e) => e.target === subDialog.current && subDialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
      >
        <h2 className="text-lg font-bold">{t("sub.dialogTitle", { name: album.name })}</h2>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void createSub();
          }}
        >
          <input
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            maxLength={ALBUM_NAME_MAX}
            placeholder={t("sub.namePlaceholder")}
            aria-label={t("sub.nameLabel")}
            className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className={buttonClass} onClick={() => subDialog.current?.close()}>
              {tc("cancel")}
            </button>
            <button type="submit" className={primaryButtonClass} disabled={!subName.trim() || busy}>
              {tc("create")}
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={moveDialog}
        onClick={(e) => e.target === moveDialog.current && moveDialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
      >
        <h2 className="text-lg font-bold">{t("move.title", { name: album.name })}</h2>
        <p className="mt-1 text-sm text-fog">{t("move.help", { max: ALBUM_MAX_DEPTH })}</p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void move();
          }}
        >
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={!targets}
            aria-label={t("move.label")}
            className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("move.root")}</option>
            {targets?.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className={buttonClass} onClick={() => moveDialog.current?.close()}>
              {tc("cancel")}
            </button>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={busy || !targets || target === (album.parentId ?? "")}
            >
              {t("move.confirm")}
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={renameDialog}
        onClick={(e) => e.target === renameDialog.current && renameDialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
      >
        <h2 className="text-lg font-bold">{t("rename.title")}</h2>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void rename();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={ALBUM_NAME_MAX}
            aria-label={t("rename.newName")}
            className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className={buttonClass}
              onClick={() => renameDialog.current?.close()}
            >
              {tc("cancel")}
            </button>
            <button type="submit" className={primaryButtonClass} disabled={!name.trim() || busy}>
              {tc("save")}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
