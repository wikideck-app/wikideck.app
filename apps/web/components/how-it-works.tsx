"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  ANIME_DROP_BANDS,
  PACK_MAX,
  PACK_REGEN_MS,
  PACK_SIZE,
  DROP_RARITIES,
  MYTHIC_RATE,
  RARITIES,
  type DropRatesResponse,
} from "@wikideck/shared";

export function HowItWorks({ drops }: { drops?: DropRatesResponse | null }) {
  const t = useTranslations("packs.how");
  const tc = useTranslations("common");
  const tr = useTranslations("cards.rarity");
  const format = useFormatter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<"wikipedia" | "anime">("wikipedia");
  const anime = kind === "anime";
  // part en pourcentage : plus la valeur est petite, plus on affiche de décimales
  const percent = (value: number) => {
    const digits = value >= 0.1 ? (value >= 1 ? 1 : 2) : 3;
    return `${format.number(value, { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`;
  };
  const rateOf = (rarity: string) => drops?.rates.find((r) => r.rarity === rarity);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="mt-1 text-xs text-pale-mist hover:text-foreground"
      >
        {t("button")}
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto max-h-[94vh] w-[min(56rem,94vw)] overflow-y-auto rounded-xl border border-line bg-surface p-6 text-left text-foreground backdrop:bg-black/60 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-medium">{t("title")}</h2>
            <p className="prose-serif mt-1.5 max-w-xl text-pale-mist">
              {anime ? t("animeIntro") : t("intro")}
            </p>
          </div>
          <button
            type="button"
            aria-label={tc("close")}
            onClick={() => dialog.current?.close()}
            className="-mr-2 -mt-2 flex size-9 shrink-0 items-center justify-center rounded-full text-xl text-pale-mist hover:bg-foreground/10 hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div role="tablist" aria-label={t("kindLabel")} className="mt-4 flex w-fit gap-1 rounded-2xl border border-line p-1">
          {(["wikipedia", "anime"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                kind === k ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
              }`}
            >
              {t(`kinds.${k}`)}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog">
              {t("ratesTitle")}
            </h3>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-fog">
                  <th className="pb-1.5 font-bold">{t("rarity")}</th>
                  <th className="pb-1.5 text-right font-bold">
                    {anime ? t("animeRank") : t("viewsPerMonth")}
                  </th>
                  {(anime || drops) && <th className="pb-1.5 text-right font-bold">{t("perCard")}</th>}
                  {(anime || drops) && <th className="pb-1.5 text-right font-bold">{t("perPack")}</th>}
                </tr>
              </thead>
              <tbody>
                {anime
                  ? ANIME_DROP_BANDS.map((band) => {
                      const info = RARITIES.find((x) => x.value === band.rarity)!;
                      const p = band.weight;
                      return (
                        <tr key={band.rarity} className="border-t border-line">
                          <td className="py-1.5">
                            <strong className="inline-block w-8">{info.code}</strong>
                            <span className="opacity-60">{tr(band.rarity)}</span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums opacity-70">
                            {format.number(band.from)} – {format.number(band.to)}
                          </td>
                          <td className="py-1.5 text-right font-bold tabular-nums">
                            {percent(p * 100)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums opacity-70">
                            {percent((1 - (1 - p) ** PACK_SIZE) * 100)}
                          </td>
                        </tr>
                      );
                    })
                  : null}
                {!anime &&
                  DROP_RARITIES.map((r, i) => {
                  const rate = rateOf(r.value);
                  return (
                    <tr key={r.value} className="border-t border-line">
                      <td className="py-1.5">
                        <strong className="inline-block w-8">{r.code}</strong>
                        <span className="opacity-60">{tr(r.value)}</span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums opacity-70">
                        {i === 0
                          ? t("below", { count: RARITIES[1].minViews })
                          : t("above", { count: r.minViews })}
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
              {t.rich("mythicNote", {
                count: Math.round(1 / MYTHIC_RATE),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            {anime ? (
              <p className="mt-2 text-[11px] leading-relaxed text-fog">{t("animeNote")}</p>
            ) : (
              drops && (
                <p className="mt-2 text-[11px] leading-relaxed text-fog">
                  {t("totalNote", { total: drops.total })}
                </p>
              )
            )}
          </section>

          <div className="flex flex-col gap-3">
            <section className="rounded-lg border border-line p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog">
                {t("packsTitle")}
              </h3>
              <p className="prose-serif mt-1.5 text-sm text-pale-mist">
                {t("packsText", {
                  max: PACK_MAX,
                  minutes: PACK_REGEN_MS / 60_000,
                  size: PACK_SIZE,
                })}
              </p>
            </section>

            {anime ? (
              <section className="rounded-lg border border-line p-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog">
                  {t("animeSpecialTitle")}
                </h3>
                <p className="prose-serif mt-1.5 text-sm text-pale-mist">{t("animeSpecialText")}</p>
              </section>
            ) : (
              <section className="rounded-lg border border-line bg-[linear-gradient(135deg,rgb(255_200_80/0.14),rgb(255_138_210/0.1),rgb(133_214_255/0.12))] p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fog">
                {t("godPackTitle")}
              </h3>
              <p className="prose-serif mt-1.5 text-sm text-pale-mist">
                {drops
                  ? t.rich("godPackKnown", {
                      percent: percent(drops.godpack),
                      size: PACK_SIZE,
                      strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
                    })
                  : t("godPackUnknown", { size: PACK_SIZE })}
              </p>
              </section>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className="mt-6 w-full rounded-lg bg-accent px-[18px] py-2.5 text-sm font-bold text-accent-foreground sm:w-auto sm:px-10"
        >
          {t("understood")}
        </button>
      </dialog>
    </>
  );
}
