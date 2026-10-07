"use client";

import { ChevronLeft, ChevronRight, Check, Pencil, Plus, Search, Trash2 } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ALBUM_NAME_MAX,
  RARITIES,
  type AlbumResponse,
  type CollectionCard,
} from "@wikideck/shared";
import { AlbumAddDialog } from "@/components/albums/album-add-dialog";
import { CardDetail } from "@/components/card-detail";
import { useConfirm } from "@/components/confirm-dialog";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { apiCall } from "@/lib/tags-api";

function href(
  id: string,
  { q, rarities, page }: { q?: string; rarities?: string[]; page?: number },
) {
  const qs = new URLSearchParams();
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
  const router = useRouter();
  const { album } = data;
  const { confirm, dialog: confirmDialog } = useConfirm();
  const renameDialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(album.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const base = {
    q: data.query,
    rarities: data.rarities.map((r) => RARITIES.find((x) => x.value === r)!.code),
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

  async function remove() {
    const ok = await confirm({
      title: `Supprimer l'album « ${album.name} » ?`,
      message: "Les cartes restent dans votre collection, seul le classeur disparaît.",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    const res = await apiCall(apiUrl, `/albums/${album.id}`, "DELETE");
    if (!res.ok) return setError(res.message);
    router.push("/albums");
  }

  async function takeOut() {
    const ids = [...picked];
    const ok = await confirm({
      title: `Retirer ${ids.length} carte${ids.length > 1 ? "s" : ""} de l'album ?`,
      message: "Elles restent dans votre collection.",
      confirmLabel: "Retirer",
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
        <Link href="/albums" className={`${buttonClass} py-1.5!`}>
          <ChevronLeft className="size-4" /> Albums
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Renommer l'album"
            title="Renommer"
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
            aria-label="Supprimer l'album"
            title="Supprimer"
            onClick={() => void remove()}
            className={`${buttonClass} px-3! text-danger!`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <h1 className="mt-6 font-display text-4xl font-medium">{album.name}</h1>
      <p className="text-sm text-fog">
        Mon album · {data.count} carte{data.count > 1 ? "s" : ""}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {data.highlights.length > 0 && (
        <section className="mt-8" aria-label="Pièces maîtresses">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-fog">
            Pièces maîtresses
          </h2>
          <div className="mt-4 flex h-96 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
            <div className="relative flex w-40 items-center justify-center sm:w-48">
              {data.highlights.map((card, i) => (
                <button
                  key={card.id}
                  type="button"
                  aria-label={`Voir ${card.title}`}
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
            Album complet
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] tabular-nums">
              {data.count}
            </span>
          </h2>
          <div className="flex gap-2">
            <button type="button" className={primaryButtonClass} onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Ajouter
            </button>
            <button
              type="button"
              aria-pressed={selectMode}
              disabled={data.count === 0}
              onClick={() => {
                setSelectMode((s) => !s);
                setPicked(new Set());
              }}
              className={`${buttonClass} ${selectMode ? "bg-accent! text-accent-foreground!" : ""}`}
            >
              {selectMode ? "Terminer" : "Sélectionner"}
            </button>
          </div>
        </div>

        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher une carte (nom ou sous-titre)"
            aria-label="Chercher dans l'album"
            className="w-full rounded-full border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <nav aria-label="Filtrer par rareté" className="mt-3 flex flex-wrap items-center gap-1">
          {data.counts.map(({ rarity, count }) => {
            const info = RARITIES.find((r) => r.value === rarity)!;
            const active = data.rarities.includes(rarity);
            const next = (
              active ? data.rarities.filter((v) => v !== rarity) : [...data.rarities, rarity]
            ).map((v) => RARITIES.find((x) => x.value === v)!.code);
            return (
              <Link
                key={rarity}
                href={href(album.id, { q: data.query, rarities: next })}
                title={`${info.label} : ${count}`}
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
              href={href(album.id, { q: data.query })}
              className="ml-2 text-xs opacity-60 hover:opacity-100"
            >
              Réinitialiser
            </Link>
          )}
        </nav>

        {data.cards.length === 0 ? (
          <p className="mt-10 text-center opacity-60">
            {data.count === 0
              ? "Cet album est vide : ajoutez-y des cartes de votre collection."
              : "Aucune carte ne correspond à ces filtres."}
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
                    aria-label={selectMode ? `Sélectionner ${card.title}` : `Voir ${card.title}`}
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
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
            {data.page > 1 ? (
              <Link
                href={href(album.id, { ...base, page: data.page - 1 })}
                aria-label="Page précédente"
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
                aria-label="Page suivante"
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
            {picked.size} carte{picked.size > 1 ? "s" : ""} sélectionnée
            {picked.size > 1 ? "s" : ""}
          </span>
          <button type="button" className={dangerButtonClass} onClick={() => void takeOut()}>
            Retirer de l&apos;album
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
          quantity={selected.quantity}
          apiUrl={apiUrl}
          onClose={() => {
            setSelectedId(null);
            router.refresh();
          }}
        />
      )}

      <dialog
        ref={renameDialog}
        onClick={(e) => e.target === renameDialog.current && renameDialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
      >
        <h2 className="text-lg font-bold">Renommer l&apos;album</h2>
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
            aria-label="Nouveau nom"
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
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass} disabled={!name.trim() || busy}>
              Enregistrer
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
