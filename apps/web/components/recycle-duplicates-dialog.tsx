"use client";

import { Check, Recycle } from "@/components/icons";
import { useEffect, useState } from "react";
import {
  RARITIES,
  type DuplicatesResponse,
  type Rarity,
  type RecycleResponse,
} from "@wikideck/shared";
import { buttonClass, dangerButtonClass } from "@/components/settings/controls";
import { Wikibits } from "@/components/wikibit";
import { apiCall, apiFetch } from "@/lib/tags-api";

const DEFAULT_CHECKED: Rarity[] = ["COMMON", "UNCOMMON", "RARE"];

export function RecycleDuplicatesDialog({
  apiUrl,
  onClose,
  onDone,
}: {
  apiUrl: string;
  onClose: () => void;
  onDone: (result: RecycleResponse) => void;
}) {
  const [data, setData] = useState<DuplicatesResponse | null>(null);
  const [checked, setChecked] = useState<Set<Rarity>>(new Set(DEFAULT_CHECKED));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecycleResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<DuplicatesResponse>(apiUrl, "/collection/duplicates").then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.data);
      else setError(res.message);
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const rows = data?.rarities ?? [];
  const chosen = rows.filter((r) => checked.has(r.rarity));
  const copies = chosen.reduce((n, r) => n + r.copies, 0);
  const total = chosen.reduce((n, r) => n + r.wikibits, 0);

  const toggle = (rarity: Rarity) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(rarity)) next.delete(rarity);
      else next.add(rarity);
      return next;
    });

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await apiCall<RecycleResponse>(apiUrl, "/collection/recycle", "POST", {
      duplicates: chosen.map((r) => r.rarity),
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setResult(res.data);
    onDone(res.data);
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
          <h2 className="mt-3 text-xl font-bold">Doublons recyclés</h2>
          <p className="mt-2 flex items-center justify-center gap-2 text-2xl font-bold">
            +<Wikibits amount={result.gained} />
          </p>
          <p className="mt-1 text-sm text-pale-mist">
            {result.copies} exemplaire{result.copies > 1 ? "s" : ""} recyclé
            {result.copies > 1 ? "s" : ""}, un exemplaire de chaque carte conservé. Nouveau solde :{" "}
            {result.wikibits} wikibits.
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
              <h2 className="text-xl font-bold">Recycler les doublons</h2>
              <p className="mt-1 text-sm text-pale-mist">
                Pour chaque carte en plusieurs exemplaires, vous gardez toujours un exemplaire :
                seuls les exemplaires en trop sont recyclés.
              </p>
            </div>
          </div>

          {!data && !error && <p className="mt-5 text-sm text-fog">Chargement…</p>}
          {data && rows.length === 0 && (
            <p className="mt-5 text-sm text-pale-mist">
              Vous n&apos;avez aucun doublon : toutes vos cartes sont en un seul exemplaire.
            </p>
          )}
          {rows.length > 0 && (
            <ul className="mt-5 space-y-1.5">
              {rows.map((r) => {
                const info = RARITIES.find((x) => x.value === r.rarity)!;
                return (
                  <li key={r.rarity}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm has-[:checked]:border-accent">
                      <input
                        type="checkbox"
                        checked={checked.has(r.rarity)}
                        onChange={() => toggle(r.rarity)}
                        className="size-4 accent-[var(--accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="inline-block w-8">{info.code}</strong>
                        <span className="opacity-60">
                          {r.cards} carte{r.cards > 1 ? "s" : ""} · {r.copies} en trop
                        </span>
                      </span>
                      <Wikibits amount={r.wikibits} className="font-semibold" />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {rows.some((r) => ["ULTRA_RARE", "LEGENDARY"].includes(r.rarity)) && (
            <p className="mt-3 text-xs leading-relaxed text-pale-mist">
              Les Ultra rares et Légendaires valent souvent bien plus aux enchères : elles ne sont
              pas cochées d&apos;office.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          <p className="mt-4 text-sm font-semibold text-danger">Cette action est irréversible.</p>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={(e) => e.currentTarget.closest("dialog")?.close()}
            >
              Annuler
            </button>
            <button
              type="button"
              className={dangerButtonClass}
              disabled={busy || copies === 0}
              onClick={confirm}
            >
              <Recycle className="size-4" />
              {busy ? "Recyclage…" : copies === 0 ? "Recycler" : `Recycler ${copies}`}
              {copies > 0 && !busy && (
                <span className="inline-flex items-center gap-1 opacity-90">
                  (+
                  <Wikibits amount={total} />)
                </span>
              )}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
