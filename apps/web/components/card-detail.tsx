"use client";

import { ArrowUpRight, Gavel, Lock, Recycle, Shield, Swords, X } from "@/components/icons";
import { useEffect, useState, type ReactNode } from "react";
import { RARITIES, RECYCLE_VALUES, type CardDto } from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { WishButton } from "@/components/wish-button";
import { Wikibits } from "@/components/wikibit";
import { apiFetch } from "@/lib/tags-api";

const fmt = new Intl.NumberFormat("fr-FR");

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
  const rarity = RARITIES.find((r) => r.value === card.rarity)!;
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
        aria-label="Fermer"
        onClick={(e) => e.currentTarget.closest("dialog")?.close()}
        className="absolute right-4 top-4 opacity-60 hover:opacity-100"
      >
        <X className="size-5" />
      </button>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <WikiCard card={card} className="w-56 shrink-0" />

        <div className="w-full min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pr-9">
            <h2 className="min-w-0 flex-1 text-2xl font-bold">{card.title}</h2>
            {onSell && quantity > 0 && (
              <button
                type="button"
                onClick={onSell}
                disabled={!!lock}
                title={lock ?? undefined}
                className={`${primaryButtonClass} shrink-0`}
              >
                {lock ? <Lock className="size-4" /> : <Gavel className="size-4" />} Mettre aux
                enchères
              </button>
            )}
          </div>
          <span className="mt-2 inline-block rounded-full border border-line px-3 py-0.5 text-xs font-bold text-pale-mist">
            {rarity.label}
          </span>
          {card.description && (
            <p className="prose-serif mt-4 text-pale-mist">{card.description}</p>
          )}
          {children && <div className="mt-5">{children}</div>}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-4 text-center bg-surface">
              <p className="flex items-center justify-center gap-2 text-xl font-bold">
                <Swords className="size-5" />
                {fmt.format(card.attack)}
              </p>
              <p className="mt-1 text-xs opacity-60">ATK</p>
            </div>
            <div className="rounded-xl border border-line p-4 text-center bg-surface">
              <p className="flex items-center justify-center gap-2 text-xl font-bold">
                <Shield className="size-5" />
                {fmt.format(card.defense)}
              </p>
              <p className="mt-1 text-xs opacity-60">DEF</p>
            </div>
          </div>

          <ul className="mt-4 space-y-1 text-sm opacity-60">
            <li>Exemplaires : {quantity}</li>
            <li>Vues (30j) : {fmt.format(card.views)}</li>
          </ul>

          {onRecycle && quantity > 0 && (
            <button
              type="button"
              onClick={onRecycle}
              disabled={!!lock}
              title={lock ?? undefined}
              className={`${buttonClass} mt-4`}
            >
              {lock ? <Lock className="size-4" /> : <Recycle className="size-4" />} Recycler un
              exemplaire
              <span className="inline-flex items-center gap-1 opacity-80">
                (+
                <Wikibits amount={RECYCLE_VALUES[card.rarity]} />)
              </span>
            </button>
          )}

          {lock && (onSell || onRecycle) && quantity > 0 && (
            <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-fog">
              <Lock className="size-3.5" /> {lock} : cette carte ne peut être ni vendue ni recyclée.
            </p>
          )}

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
            Voir l&apos;article sur Wikipédia
            <ArrowUpRight className="size-4" />
          </a>
          {!card.imageUrl && (
            <p className="mt-3 text-xs text-fog">
              Wikipédia n&apos;a pas d&apos;image libre de droits pour cet article.
            </p>
          )}
          <p className="mt-3 text-xs opacity-50">
            Texte de l&apos;article : CC BY-SA 4.0 — crédits sur la page Wikipédia.
          </p>
        </div>
      </div>
    </dialog>
  );
}
