"use client";

import { useRef } from "react";
import {
  PACK_MAX,
  PACK_REGEN_MS,
  PACK_SIZE,
  DROP_RARITIES,
  MYTHIC_RATE,
  RARITIES,
  type DropRatesResponse,
} from "@wikideck/shared";

const fmt = new Intl.NumberFormat("fr-FR");

function percent(value: number) {
  const digits = value >= 10 ? 1 : value >= 1 ? 1 : value >= 0.1 ? 2 : 3;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)} %`;
}

export function HowItWorks({ drops }: { drops?: DropRatesResponse | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const rateOf = (rarity: string) => drops?.rates.find((r) => r.rarity === rarity);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="mt-1 text-xs text-pale-mist hover:text-foreground"
      >
        Comment ça marche ?
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto max-h-[94vh] w-[min(56rem,94vw)] overflow-y-auto rounded-xl border border-line bg-surface p-6 text-left text-foreground backdrop:bg-black/60 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-medium">Comment ça marche ?</h2>
            <p className="prose-serif mt-1.5 max-w-xl text-pale-mist">
              Chaque carte est générée à partir d&apos;un vrai article Wikipédia. Sa rareté dépend
              de la popularité de l&apos;article : plus il est consulté, plus la carte est rare.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => dialog.current?.close()}
            className="-mr-2 -mt-2 flex size-9 shrink-0 items-center justify-center rounded-full text-xl text-pale-mist hover:bg-foreground/10 hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog">
              Raretés et taux de drop
            </h3>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-fog">
                  <th className="pb-1.5 font-bold">Rareté</th>
                  <th className="pb-1.5 text-right font-bold">Vues / mois</th>
                  {drops && <th className="pb-1.5 text-right font-bold">Par carte</th>}
                  {drops && <th className="pb-1.5 text-right font-bold">≥ 1 / paquet</th>}
                </tr>
              </thead>
              <tbody>
                {DROP_RARITIES.map((r, i) => {
                  const rate = rateOf(r.value);
                  return (
                    <tr key={r.value} className="border-t border-line">
                      <td className="py-1.5">
                        <strong className="inline-block w-8">{r.code}</strong>
                        <span className="opacity-60">{r.label}</span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums opacity-70">
                        {i === 0
                          ? `< ${fmt.format(RARITIES[1].minViews)}`
                          : `${fmt.format(r.minViews)}+`}
                      </td>
                      {drops && (
                        <td className="py-1.5 text-right font-bold tabular-nums">
                          {rate ? percent(rate.percent) : "—"}
                        </td>
                      )}
                      {drops && (
                        <td className="py-1.5 text-right tabular-nums opacity-70">
                          {rate ? percent(rate.perPack) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] leading-relaxed text-fog">
              <strong>M · Mythique</strong> : une carte légendaire sur{" "}
              {Math.round(1 / MYTHIC_RATE)} sort en version mythique, la même carte en « full
              art ». Elle ne se trouve que dans les paquets.
            </p>
            {drops && (
              <p className="mt-2 text-[11px] leading-relaxed text-fog">
                Chaque carte est tirée au hasard parmi les {fmt.format(drops.total)} articles de
                Wikipédia FR : sa chance est la part de sa rareté dans l&apos;encyclopédie. Taux
                approximatifs, les articles trop courts sont écartés.
              </p>
            )}
          </section>

          <div className="flex flex-col gap-3">
            <section className="rounded-lg border border-line p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog">
                Paquets
              </h3>
              <p className="prose-serif mt-1.5 text-sm text-pale-mist">
                {PACK_MAX} paquets au maximum, un nouveau toutes les {PACK_REGEN_MS / 60_000}{" "}
                minutes. Chaque paquet contient {PACK_SIZE} cartes, triées par rareté croissante.
              </p>
            </section>

            <section className="rounded-lg border border-line bg-[linear-gradient(135deg,rgb(255_200_80/0.14),rgb(255_138_210/0.1),rgb(133_214_255/0.12))] p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog">
                God Pack
              </h3>
              <p className="prose-serif mt-1.5 text-sm text-pale-mist">
                {drops ? (
                  <>
                    Avec <strong className="text-foreground">{percent(drops.godpack)}</strong> de
                    chances par paquet,
                  </>
                ) : (
                  "Très rarement,"
                )}{" "}
                les {PACK_SIZE} cartes sont toutes Super rare ou mieux, dont au moins une Ultra rare
                ou Légendaire.
              </p>
            </section>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className="mt-6 w-full rounded-lg bg-accent px-[18px] py-2.5 text-sm font-bold text-accent-foreground sm:w-auto sm:px-10"
        >
          Compris
        </button>
      </dialog>
    </>
  );
}
