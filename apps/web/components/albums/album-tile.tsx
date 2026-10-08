import { BookBookmark } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AlbumSummary } from "@wikideck/shared";
import { WikiCard } from "@/components/wiki-card";

// éventail : la plus belle carte au centre, les deux suivantes de chaque côté
const FAN = ["z-20 scale-110", "z-10 -translate-x-14 -rotate-6", "z-10 translate-x-14 rotate-6"];

export function AlbumTile({ album: a }: { album: AlbumSummary }) {
  const t = useTranslations("albums");
  return (
    <div className="group relative rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent">
      {/* lien étiré par-dessus : les cartes contiennent déjà un lien, pas de lien dans un lien */}
      <Link
        href={`/albums/${a.id}`}
        aria-label={t("open", { name: a.name })}
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
        {t("cards", { count: a.cards })}
        {a.subAlbums > 0 && ` · ${t("subAlbums", { count: a.subAlbums })}`}
      </p>
    </div>
  );
}
