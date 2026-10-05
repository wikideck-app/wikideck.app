"use client";

import { Check, Recycle } from "@/components/icons";
import { useState } from "react";
import {
  RARITIES,
  RECYCLE_VALUES,
  type CollectionCard,
  type RecycleResponse,
} from "@wikideck/shared";
import { buttonClass, dangerButtonClass } from "@/components/settings/controls";
import { Wikibits } from "@/components/wikibit";
import { apiCall } from "@/lib/tags-api";

export type RecycleLine = { card: CollectionCard; quantity: number };

export const recycleTotal = (lines: RecycleLine[]) =>
  lines.reduce((sum, l) => sum + RECYCLE_VALUES[l.card.rarity] * l.quantity, 0);

export function RecycleDialog({
  apiUrl,
  lines,
  onClose,
  onDone,
}: {
  apiUrl: string;
  lines: RecycleLine[];
  onClose: () => void;
  onDone: (result: RecycleResponse, lines: RecycleLine[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecycleResponse | null>(null);

  const total = recycleTotal(lines);
  const copies = lines.reduce((n, l) => n + l.quantity, 0);
  const single = copies === 1;
  const lastCopies = lines.filter((l) => l.quantity >= l.card.quantity);
  const precious = lines.some(
    (l) => l.card.rarity === "ULTRA_RARE" || l.card.rarity === "LEGENDARY",
  );
  const breakdown = RARITIES.map((r) => ({
    rarity: r,
    copies: lines.filter((l) => l.card.rarity === r.value).reduce((n, l) => n + l.quantity, 0),
  })).filter((r) => r.copies > 0);

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await apiCall<RecycleResponse>(apiUrl, "/collection/recycle", "POST", {
      cards: lines.map((l) => ({ cardId: l.card.id, quantity: l.quantity })),
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setResult(res.data);
    onDone(res.data, lines);
  }

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && !busy && e.currentTarget.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
    >
      {result ? (
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-6" />
          </span>
          <h2 className="mt-3 text-xl font-bold">Recyclage effectué</h2>
          <p className="mt-2 flex items-center justify-center gap-2 text-2xl font-bold">
            +<Wikibits amount={result.gained} />
          </p>
          <p className="mt-1 text-sm text-pale-mist">
            {result.copies} exemplaire{result.copies > 1 ? "s" : ""} recyclé
            {result.copies > 1 ? "s" : ""}. Nouveau solde : {result.wikibits} wikibits.
          </p>
          <button
            type="button"
            className={`${buttonClass} mt-5`}
            onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          >
            Fermer
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <Recycle className="mt-1 size-6 shrink-0 text-accent" />
            <div>
              <h2 className="text-xl font-bold">
                {single ? (
                  <>
                    Recycler cette carte contre <Wikibits amount={total} className="align-middle" />{" "}
                    ?
                  </>
                ) : (
                  <>
                    Recycler {copies} cartes contre{" "}
                    <Wikibits amount={total} className="align-middle" /> ?
                  </>
                )}
              </h2>
              <p className="mt-1 text-sm font-semibold text-danger">
                Cette action est irréversible.
              </p>
            </div>
          </div>

          {single ? (
            <p className="mt-4 text-sm text-pale-mist">
              « {lines[0].card.title} » (
              {RARITIES.find((r) => r.value === lines[0].card.rarity)!.label}
              ).
            </p>
          ) : (
            <ul className="mt-4 space-y-1 rounded-xl border border-line p-3 text-sm">
              {breakdown.map(({ rarity, copies: n }) => (
                <li key={rarity.value} className="flex items-center justify-between">
                  <span>
                    <strong className="inline-block w-8">{rarity.code}</strong>
                    <span className="opacity-60">
                      {n} × {RECYCLE_VALUES[rarity.value]}
                    </span>
                  </span>
                  <Wikibits amount={n * RECYCLE_VALUES[rarity.value]} className="font-semibold" />
                </li>
              ))}
            </ul>
          )}

          {lastCopies.length > 0 && (
            <p className="mt-3 text-xs leading-relaxed text-pale-mist">
              {lines.length === 1
                ? lines[0].quantity === 1
                  ? "C'est votre dernier exemplaire de cette carte : elle quittera votre collection."
                  : "Tous les exemplaires de cette carte sont recyclés : elle quittera votre collection."
                : lastCopies.length === lines.length
                  ? "Tous les exemplaires de ces cartes sont recyclés : elles quitteront votre collection."
                  : `${lastCopies.length} de ces cartes quitteront votre collection (leurs derniers exemplaires).`}
            </p>
          )}
          {precious && (
            <p className="mt-2 text-xs leading-relaxed text-pale-mist">
              Cette sélection contient des cartes Ultra rares ou Légendaires : elles valent souvent
              bien plus aux enchères.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={(e) => e.currentTarget.closest("dialog")?.close()}
            >
              Annuler
            </button>
            <button type="button" className={dangerButtonClass} disabled={busy} onClick={confirm}>
              <Recycle className="size-4" /> {busy ? "Recyclage…" : "Recycler"}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
