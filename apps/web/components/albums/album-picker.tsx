"use client";

import { BookBookmark, Check } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { AlbumSummary, AlbumsResponse } from "@wikideck/shared";
import { apiCall, apiFetch } from "@/lib/tags-api";

export function AlbumPicker({ apiUrl, cardId }: { apiUrl: string; cardId: string }) {
  const t = useTranslations("albums");
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<AlbumsResponse>(apiUrl, `/albums?card=${cardId}`).then((res) => {
      if (!cancelled && res.ok) setAlbums(res.data.albums);
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, cardId]);

  async function toggle(album: AlbumSummary) {
    setBusy(album.id);
    setError(null);
    const res = await apiCall(apiUrl, `/albums/${album.id}/cards`, "PUT", {
      [album.hasCard ? "remove" : "add"]: [cardId],
    });
    setBusy(null);
    if (!res.ok) return setError(res.message);
    setAlbums(
      (prev) =>
        prev?.map((a) =>
          a.id === album.id
            ? { ...a, hasCard: !a.hasCard, cards: a.cards + (a.hasCard ? -1 : 1) }
            : a,
        ) ?? null,
    );
  }

  if (!albums) return null;
  return (
    <div className="mt-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-60">
        <BookBookmark className="size-3.5" /> {t("title")}
      </h3>
      {albums.length === 0 ? (
        <p className="mt-2 text-sm text-fog">
          {t("picker.none")}{" "}
          <Link href="/albums" className="underline hover:text-foreground">
            {t("picker.create")}
          </Link>
        </p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {albums.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                aria-pressed={a.hasCard}
                disabled={busy === a.id}
                onClick={() => void toggle(a)}
                className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm transition-colors hover:bg-foreground/10 aria-pressed:border-accent aria-pressed:bg-accent/15 aria-pressed:text-accent disabled:opacity-50"
              >
                {a.hasCard && <Check className="size-3.5" />}
                {a.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
