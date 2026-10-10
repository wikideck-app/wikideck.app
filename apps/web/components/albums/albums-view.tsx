"use client";

import { Plus, X } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ALBUM_NAME_MAX, type AlbumsResponse } from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { AlbumTile } from "@/components/albums/album-tile";
import { apiCall } from "@/lib/tags-api";

export function AlbumsView({ data, apiUrl }: { data: AlbumsResponse; apiUrl: string }) {
  const t = useTranslations("albums");
  const tc = useTranslations("common");
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const roots = data.albums.filter((a) => a.parentId === null);
  const full = data.albums.length >= data.max;

  // glisser un album sur un autre : il est rangé dedans (le serveur refuse cycles et excès de niveaux)
  async function move(draggedId: string, targetId: string) {
    setError(null);
    const res = await apiCall(apiUrl, `/albums/${draggedId}`, "PATCH", { parentId: targetId });
    if (!res.ok) return setMoveError(res.message);
    setMoveError(null);
    router.refresh();
  }

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
        {t("intro", { count: data.albums.length, max: data.max })}
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
          <Plus className="size-4" /> {t("new")}
        </button>
      </div>

      {roots.length === 0 ? (
        <p className="mt-10 text-center opacity-60">
          {t("empty")}
        </p>
      ) : (
        <>
          {roots.length > 1 && <p className="mt-6 text-center text-xs text-fog">{t("dragHint")}</p>}
          {moveError && (
            <p role="alert" className="mt-2 text-center text-sm text-danger">
              {moveError}
            </p>
          )}
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roots.map((a) => (
              <li key={a.id}>
                <AlbumTile album={a} onMove={move} />
              </li>
            ))}
          </ul>
        </>
      )}

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
      >
        <button
          type="button"
          aria-label={tc("close")}
          onClick={() => dialog.current?.close()}
          className="absolute right-4 top-4 opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
        <h2 className="text-lg font-bold">{t("new")}</h2>
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
            placeholder={t("nameLabel")}
            aria-label={t("nameLabel")}
            className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className={buttonClass} onClick={() => dialog.current?.close()}>
              {tc("cancel")}
            </button>
            <button type="submit" className={primaryButtonClass} disabled={!name.trim() || busy}>
              {tc("create")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
