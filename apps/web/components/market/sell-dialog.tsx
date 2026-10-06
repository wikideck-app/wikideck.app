"use client";

import { Check, X } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  MARKET_DURATIONS,
  MARKET_FEE_PERCENT,
  MARKET_MAX_PRICE,
  sellerProceeds,
  type CollectionCard,
} from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { ShowcasePicker } from "@/components/settings/showcase-picker";
import { WikiCard } from "@/components/wiki-card";
import { Wikibits } from "@/components/wikibit";
import { apiCall } from "@/lib/tags-api";

const durationLabel = (h: number) => (h < 24 ? `${h} h` : `${h / 24} j`);

export function SellDialog({
  apiUrl,
  onClose,
  initialCard,
  onListed,
}: {
  apiUrl: string;
  onClose: () => void;
  initialCard?: CollectionCard;
  onListed?: (card: CollectionCard, auctionId: string) => void;
}) {
  const router = useRouter();
  const [card, setCard] = useState<CollectionCard | null>(initialCard ?? null);
  const [listed, setListed] = useState<string | null>(null);
  const [price, setPrice] = useState("20");
  const [hours, setHours] = useState<number>(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = useRef(false);

  const value = Number(price);
  const valid = Number.isInteger(value) && value >= 1 && value <= MARKET_MAX_PRICE;

  if (!card) {
    return (
      <ShowcasePicker
        apiUrl={apiUrl}
        onSelect={(c) => {
          picked.current = true;
          setCard(c);
        }}
        onClose={() => {
          if (!picked.current) onClose();
        }}
        title="Quelle carte mettre en vente ?"
        description="Elle quitte votre collection jusqu'à la fin de l'enchère. Si personne ne mise, elle vous revient."
      />
    );
  }

  async function submit() {
    if (!card || !valid) return;
    setBusy(true);
    setError(null);
    const result = await apiCall<{ id: string }>(apiUrl, "/market", "POST", {
      cardId: card.id,
      startPrice: value,
      hours,
    });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    if (onListed) {
      onListed(card, result.data.id);
      setListed(result.data.id);
    } else router.push(`/market/${result.data.id}`);
  }

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
        <h2 className="text-xl font-bold">Mettre en vente</h2>
        <button
          type="button"
          aria-label="Fermer"
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          className="opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="mt-5 flex gap-5">
        <div className="w-32 shrink-0 sm:w-40">
          <WikiCard card={card} compact />
          {!initialCard && !listed && (
            <button
              type="button"
              onClick={() => setCard(null)}
              className="mt-2 w-full text-center text-xs text-pale-mist underline"
            >
              Changer de carte
            </button>
          )}
        </div>
        {listed ? (
          <div className="min-w-0 flex-1 space-y-3">
            <p className="flex items-center gap-2 text-lg font-bold text-success">
              <Check className="size-5" /> Mise en vente !
            </p>
            <p className="text-sm text-pale-mist">
              « {card.title} » est aux enchères. Elle quitte votre collection jusqu&apos;à la fin de
              la vente ; si personne ne mise, elle vous revient.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => router.push(`/market/${listed}`)}
              >
                Voir l&apos;enchère
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={(e) => e.currentTarget.closest("dialog")?.close()}
              >
                Continuer
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1 space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-fog">
                Prix de départ
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MARKET_MAX_PRICE}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-2 w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-fog">Durée</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MARKET_DURATIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={hours === h}
                    onClick={() => setHours(h)}
                    className="rounded-full border border-line px-3 py-1 text-sm font-bold transition-colors hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-foreground"
                  >
                    {durationLabel(h)}
                  </button>
                ))}
              </div>
            </div>
            {valid && (
              <p className="text-xs leading-relaxed text-pale-mist">
                Frais de vente : {MARKET_FEE_PERCENT} %. Au prix de départ, vous toucheriez{" "}
                <Wikibits amount={sellerProceeds(value)} className="font-bold text-foreground" />.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      {!listed && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className={buttonClass}
            onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          >
            Annuler
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={!valid || busy}
            onClick={submit}
          >
            {busy ? "Mise en vente…" : "Mettre en vente"}
          </button>
        </div>
      )}
    </dialog>
  );
}
