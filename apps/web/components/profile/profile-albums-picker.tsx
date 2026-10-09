"use client";

import { Check, X } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PROFILE_ALBUMS_MAX, type AlbumSummary, type AlbumsResponse } from "@wikideck/shared";
import { buttonClass } from "@/components/settings/controls";
import { pathLabel } from "@/lib/album-tree";
import { apiCall, apiFetch } from "@/lib/tags-api";

export function ProfileAlbumsPicker({
  apiUrl,
  onClose,
}: {
  apiUrl: string;
  onClose: () => void;
}) {
  const t = useTranslations("profile.albumsPicker");
  const tc = useTranslations("common");
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<AlbumsResponse>(apiUrl, "/albums").then((res) => {
      if (cancelled) return;
      if (res.ok) setAlbums(res.data.albums);
      else setError(res.message);
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const shown = albums?.filter((a) => a.onProfile).length ?? 0;

  async function toggle(album: AlbumSummary) {
    setBusy(album.id);
    setError(null);
    const res = await apiCall(apiUrl, `/albums/${album.id}`, "PATCH", {
      onProfile: !album.onProfile,
    });
    setBusy(null);
    if (!res.ok) return setError(res.message);
    setAlbums((prev) => prev?.map((a) => (a.id === album.id ? { ...a, onProfile: !a.onProfile } : a)) ?? null);
  }

  const sorted = albums
    ? albums
        .map((a) => ({ album: a, label: pathLabel(albums, a.id) }))
        .sort((x, y) => x.label.localeCompare(y.label))
    : [];

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="mt-1 text-sm text-pale-mist">
            {t("description", { count: shown, max: PROFILE_ALBUMS_MAX })}
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

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 max-h-[55vh] overflow-y-auto pr-1">
        {!albums ? (
          <p className="py-6 text-center text-sm text-fog">{tc("loading")}</p>
        ) : sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-fog">{t("none")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sorted.map(({ album: a, label }) => {
              const full = !a.onProfile && shown >= PROFILE_ALBUMS_MAX;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={!!a.onProfile}
                    disabled={busy !== null || full}
                    onClick={() => void toggle(a)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      a.onProfile ? "border-accent bg-accent/10" : "border-line hover:border-accent"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                        a.onProfile ? "border-accent bg-accent text-accent-foreground" : "border-line"
                      }`}
                    >
                      {a.onProfile && <Check className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{label}</span>
                    <span className="shrink-0 text-xs text-fog">{t("cards", { count: a.cards })}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className={buttonClass}
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
        >
          {t("done")}
        </button>
      </div>
    </dialog>
  );
}
