"use client";

import Image from "next/image";
import { BookBookmark } from "@/components/icons";
import { useTranslations } from "next-intl";
import { RARITIES, type CardDto, type TagColor } from "@wikideck/shared";
import { useRarityLabel } from "@/lib/labels";
import { swatchStyle } from "@/lib/tag-style";

export function WikiCard({
  card,
  quantity,
  isNew,
  compact,
  tags,
  inAlbum,
  className = "",
}: {
  card: CardDto;
  quantity?: number;
  /** la carte est rangée dans au moins un album */
  inAlbum?: boolean;
  tags?: { name: string; color: TagColor }[];
  isNew?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("cards.wikiCard");
  const rarityLabel = useRarityLabel();
  const info = RARITIES.find((x) => x.value === card.rarity)!;
  const pill = isNew ? t("new") : quantity !== undefined && quantity > 1 ? `×${quantity}` : "";

  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--ry", `${((e.clientX - box.left) / box.width - 0.5) * 14}deg`);
    el.style.setProperty("--rx", `${-((e.clientY - box.top) / box.height - 0.5) * 14}deg`);
  };
  const untilt = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };

  return (
    <div className={`wk-wrap ${className}`}>
      <article
        className={`wk r-${info.code}${compact ? " compact" : ""}`}
        onPointerMove={tilt}
        onPointerLeave={untilt}
      >
        <div className="top">
          <span className="b" title={rarityLabel(info.value)}>
            {info.code}
          </span>
          <h3 className="t">
            <a href={card.url} target="_blank" rel="noreferrer" title={card.title}>
              {card.title}
            </a>
          </h3>
        </div>

        <div className="art">
          <Image
            src="/logo.webp"
            alt=""
            width={96}
            height={96}
            draggable={false}
            className="logo"
          />
          {card.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="photo"
              onError={(e) => (e.currentTarget.dataset.error = "1")}
              ref={(el) => {
                if (el?.complete && el.naturalWidth === 0) el.dataset.error = "1";
              }}
            />
          )}
          {tags && tags.length > 0 && (
            <div className="dots">
              {tags.map((tag) => (
                <i key={tag.name} title={tag.name} style={swatchStyle(tag.color)} />
              ))}
            </div>
          )}
          {inAlbum && (
            <span className="album" title={t("inAlbumTitle")}>
              <BookBookmark aria-hidden />
              {t("inAlbum")}
            </span>
          )}
          <span className="cr">{card.source === "ANILIST" ? t("creditAnilist") : t("credit")}</span>
        </div>

        <div className="tx">
          <p>{card.extract || card.description}</p>
        </div>

        <div className="st">
          {card.source === "ANILIST" && card.description && (
            <span className="series" title={card.description}>
              {card.description}
            </span>
          )}
          <b className="pill">{pill}</b>
        </div>
      </article>
    </div>
  );
}

export function FlipCard({
  card,
  flipped,
  onToggle,
  isNew,
  compact,
  className = "",
}: {
  card: CardDto;
  flipped: boolean;
  onToggle: () => void;
  isNew?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`flip-scene aspect-250/370 ${className}`}>
      <div
        className="flip-inner cursor-pointer"
        data-flipped={flipped}
        onClick={(e) => !(e.target as HTMLElement).closest("a") && onToggle()}
      >
        <div className="flip-face flip-face-back">
          <Image
            src="/dos_carte.webp"
            alt=""
            width={1260}
            height={1760}
            className="size-full object-fill drop-shadow-xl"
            draggable={false}
          />
        </div>
        <div className="flip-face flip-face-front">
          <WikiCard card={card} isNew={isNew} compact={compact} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
