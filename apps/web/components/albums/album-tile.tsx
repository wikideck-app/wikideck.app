import { BookBookmark } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { AlbumSummary } from "@wikideck/shared";
import { WikiCard } from "@/components/wiki-card";

/** Type de donnée du glisser-déposer : l'identifiant de l'album déplacé. */
export const ALBUM_DRAG_TYPE = "application/x-wikideck-album";

// éventail : la plus belle carte au centre, les deux suivantes de chaque côté
const FAN = ["z-20 scale-110", "z-10 -translate-x-14 -rotate-6", "z-10 translate-x-14 rotate-6"];

export function AlbumTile({
  album: a,
  readOnly = false,
  onMove,
}: {
  album: AlbumSummary;
  readOnly?: boolean;
  /** glisser-déposer : `draggedId` a été déposé sur cet album (le rangera dedans) */
  onMove?: (draggedId: string, targetId: string) => void;
}) {
  const [over, setOver] = useState(false);
  const t = useTranslations("albums");
  return (
    <div
      draggable={!!onMove}
      onDragStart={(e) => {
        if (!onMove) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(ALBUM_DRAG_TYPE, a.id);
      }}
      onDragOver={(e) => {
        if (!onMove || !e.dataTransfer.types.includes(ALBUM_DRAG_TYPE)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const id = e.dataTransfer.getData(ALBUM_DRAG_TYPE);
        if (!onMove || !id || id === a.id) return;
        e.preventDefault();
        onMove(id, a.id);
      }}
      className={`group relative rounded-xl border bg-surface p-5 transition-colors ${
        over ? "border-accent bg-accent/10 ring-2 ring-accent" : "border-line"
      } ${readOnly ? "" : "hover:border-accent"} ${onMove ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {/* lien étiré par-dessus : les cartes contiennent déjà un lien, pas de lien dans un lien */}
      {!readOnly && (
        <Link
          href={`/albums/${a.id}`}
          aria-label={t("open", { name: a.name })}
          draggable={false}
          className="absolute inset-0 z-30 rounded-xl"
        />
      )}
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
        {t("cards", { count: a.cards })}
        {a.subAlbums > 0 && ` · ${t("subAlbums", { count: a.subAlbums })}`}
      </p>
    </div>
  );
}
