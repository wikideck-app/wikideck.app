"use client";

import { ArrowUpRight, Gavel, Lock, Recycle, X } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { RECYCLE_VALUES, isAnimeSource, type CardDto } from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { AlbumPicker } from "@/components/albums/album-picker";
import { WishButton } from "@/components/wish-button";
import { Wikibits } from "@/components/wikibit";
import { useRarityLabel } from "@/lib/labels";
import { apiFetch } from "@/lib/tags-api";

export function CardDetail({
  card,
  quantity,
  onClose,
  onSell,
  onRecycle,
  apiUrl,
  children,
}: {
  card: CardDto;
  quantity: number;
  onClose: () => void;
  onSell?: () => void;
  onRecycle?: () => void;
  apiUrl?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("cards.detail");
  const tc = useTranslations("common");
  const rarityLabel = useRarityLabel();
  const [lock, setLock] = useState<string | null>(null);
  const wantsLock = !!apiUrl && (!!onSell || !!onRecycle);
  useEffect(() => {
    if (!wantsLock) return;
    let cancelled = false;
    void apiFetch<{ locks: Record<string, string> }>(apiUrl, "/collection/locks").then((res) => {
      if (!cancelled && res.ok) setLock(res.data.locks[card.id] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, wantsLock, card.id]);

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-xl border border-line bg-surface p-7 text-foreground backdrop:bg-black/70"
    >
      <button
        type="button"
        aria-label={tc("close")}
        onClick={(e) => e.currentTarget.closest("dialog")?.close()}
        className="absolute right-4 top-4 opacity-60 hover:opacity-100"
      >
        <X className="size-5" />
      </button>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <WikiCard card={card} className="w-56 shrink-0" />

        <div className="w-full min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pr-9">
            <h2 className="min-w-0 grow basis-48 wrap-break-word text-2xl font-bold">
              {card.title}
            </h2>
            {onSell && quantity > 0 && (
              <button
                type="button"
                onClick={onSell}
                disabled={!!lock}
                title={lock ?? undefined}
                className={`${primaryButtonClass} shrink-0`}
              >
                {lock ? <Lock className="size-4" /> : <Gavel className="size-4" />} {t("sell")}
              </button>
            )}
          </div>
          <span className="mt-2 inline-block rounded-full border border-line px-3 py-0.5 text-xs font-bold text-pale-mist">
            {rarityLabel(card.rarity)}
          </span>
          {card.description && (
            <p className="prose-serif mt-4 text-pale-mist">{card.description}</p>
          )}
          {children && <div className="mt-5">{children}</div>}

          <ul className="mt-4 space-y-1 text-sm opacity-60">
            <li>{t("copies", { count: quantity })}</li>
            <li>{t("views", { count: card.views })}</li>
          </ul>

          {onRecycle && quantity > 0 && (
            <button
              type="button"
              onClick={onRecycle}
              disabled={!!lock}
              title={lock ?? undefined}
              className={`${buttonClass} mt-4`}
            >
              {lock ? <Lock className="size-4" /> : <Recycle className="size-4" />} {t("recycle")}
              <span className="inline-flex items-center gap-1 opacity-80">
                (+
                <Wikibits amount={RECYCLE_VALUES[card.rarity]} />)
              </span>
            </button>
          )}

          {lock && (onSell || onRecycle) && quantity > 0 && (
            <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-fog">
              <Lock className="size-3.5" /> {t("locked", { reason: lock })}
            </p>
          )}

          {apiUrl && quantity > 0 && <AlbumPicker apiUrl={apiUrl} cardId={card.id} />}

          {apiUrl && (
            <div className="mt-4">
              <WishButton apiUrl={apiUrl} cardId={card.id} />
            </div>
          )}

          <a
            href={card.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 font-bold text-pale-mist hover:text-foreground"
          >
            {card.source === "ANILIST"
              ? t("viewOnAnilist")
              : card.source === "KITSU"
                ? t("viewOnKitsu")
                : t("viewOnWikipedia")}
            <ArrowUpRight className="size-4" />
          </a>
          {!card.imageUrl && !isAnimeSource(card.source) && (
            <p className="mt-3 text-xs text-fog">
              {t("noFreeImage")}
            </p>
          )}
          <p className="mt-3 text-xs opacity-50">
            {card.source === "ANILIST"
              ? t("licenseAnilist")
              : card.source === "KITSU"
                ? t("licenseKitsu")
                : t("license")}
          </p>
        </div>
      </div>
    </dialog>
  );
}
