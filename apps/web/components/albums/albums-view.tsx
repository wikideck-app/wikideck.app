"use client";

import { BookBookmark, Plus, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ALBUM_NAME_MAX, type AlbumsResponse } from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { apiCall } from "@/lib/tags-api";

// éventail : la plus belle carte au centre, les deux suivantes de chaque côté
const FAN = ["z-20 scale-110", "z-10 -translate-x-14 -rotate-6", "z-10 translate-x-14 rotate-6"];

export function AlbumsView({ data, apiUrl }: { data: AlbumsResponse; apiUrl: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = data.albums.length >= data.max;

  async function create() {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    const res = await apiCall<{ id: string }>(apiUrl, "/albums", "POST", { name: clean });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    dialog.current?.close();
    router.push(`/albums/${res.data.id}`);
  }

  return (
    <>
      <p className="mt-3 text-center text-sm text-pale-mist">
        Rangez vos cartes dans des classeurs : une carte peut figurer dans plusieurs albums.{" "}
        {data.albums.length} / {data.max}
      </p>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          disabled={full}
          onClick={() => {
            setName("");
            setError(null);
            dialog.current?.showModal();
          }}
          className={primaryButtonClass}
        >
          <Plus className="size-4" /> Nouvel album
        </button>
      </div>

      {data.albums.length === 0 ? (
        <p className="mt-10 text-center opacity-60">
          Aucun album pour l&apos;instant. Créez-en un, puis ajoutez-y des cartes depuis sa page ou
          depuis la fiche d&apos;une carte.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.albums.map((a) => (
            <li key={a.id}>
              <div className="group relative rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent">
                {/* lien étiré par-dessus : les cartes contiennent déjà un lien, pas de lien dans un lien */}
                <Link
                  href={`/albums/${a.id}`}
                  aria-label={`Ouvrir l'album ${a.name}`}
                  className="absolute inset-0 z-30 rounded-xl"
                />
                <div className="relative flex h-40 items-center justify-center">
                  {a.top.length === 0 ? (
                    <BookBookmark className="size-14 text-fog" />
                  ) : (
                    a.top.map((card, i) => (
                      <WikiCard
                        key={card.id}
                        card={card}
                        compact
                        className={`absolute w-24 transition-transform duration-300 group-hover:-translate-y-1 ${FAN[i]}`}
                      />
                    ))
                  )}
                </div>
                <h2 className="mt-4 truncate text-lg font-bold">{a.name}</h2>
                <p className="text-sm text-fog">
                  {a.cards} carte{a.cards > 1 ? "s" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => dialog.current?.close()}
          className="absolute right-4 top-4 opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
        <h2 className="text-lg font-bold">Nouvel album</h2>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={ALBUM_NAME_MAX}
            placeholder="Nom de l'album"
            aria-label="Nom de l'album"
            className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className={buttonClass} onClick={() => dialog.current?.close()}>
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass} disabled={!name.trim() || busy}>
              Créer
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
