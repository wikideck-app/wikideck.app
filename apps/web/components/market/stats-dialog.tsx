"use client";

import { LineChart, X } from "@/components/icons";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RARITIES, type MarketStats, type Rarity } from "@wikideck/shared";
import { Wikibits } from "@/components/wikibit";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { useRarityLabel } from "@/lib/labels";
import { apiFetch } from "@/lib/tags-api";
import { PriceChart } from "./price-chart";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2.5 bg-surface">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fog">{label}</p>
      <p className="mt-1 text-lg font-bold">{children}</p>
    </div>
  );
}

export function StatsDialog({
  apiUrl,
  title,
  initialRarity = null,
  onClose,
}: {
  apiUrl: string;
  title?: string;
  initialRarity?: Rarity | null;
  onClose: () => void;
}) {
  const t = useTranslations("market.stats");
  const tc = useTranslations("common");
  const format = useFormatter();
  const rarityName = useRarityLabel();
  const rarityLabel = (r: Rarity | null) => (r ? rarityName(r) : t("allRarities"));
  const [rarity, setRarity] = useState<Rarity | null>(initialRarity);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const code = rarity ? RARITIES.find((r) => r.value === rarity)!.code : "";
    void apiFetch<MarketStats>(apiUrl, `/market/stats${code ? `?rarity=${code}` : ""}`).then(
      (r) => {
        if (cancelled) return;
        if (r.ok) {
          setStats(r.data);
          setError(null);
        } else setError(r.message);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [apiUrl, rarity]);

  const money = (v: number | null) => (v === null ? "—" : <Wikibits amount={v} />);

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <LineChart className="size-5 text-pale-mist" />
          <div>
            <h2 className="text-lg font-bold">{t("title")}</h2>
            {title && <p className="text-sm text-fog">{title}</p>}
          </div>
        </div>
        <button
          type="button"
          aria-label={tc("close")}
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          className="opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1" role="group" aria-label={t("rarity")}>
        <button
          type="button"
          aria-pressed={rarity === null}
          onClick={() => setRarity(null)}
          className="rounded-full px-3 py-1.5 text-sm font-bold transition hover:bg-foreground/10 aria-pressed:bg-foreground/15"
        >
          {t("all")}
        </button>
        {[...RARITIES].reverse().map((r) => (
          <button
            key={r.value}
            type="button"
            title={rarityName(r.value)}
            aria-pressed={rarity === r.value}
            onClick={() => setRarity(r.value)}
            style={{ color: RARITY_COLOR[r.value] }}
            className="min-w-11 rounded-full px-3 py-1.5 text-center text-sm font-bold transition hover:bg-foreground/10 aria-pressed:bg-foreground/15"
          >
            {r.code}
          </button>
        ))}
      </div>

      {error && <p className="mt-6 text-sm text-danger">{error}</p>}
      {!stats && !error && <p className="py-10 text-center text-sm text-fog">{tc("loading")}</p>}
      {stats && (
        <>
          <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-fog">
            {t("priceTrend", { rarity: rarityLabel(stats.rarity) })}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label={t("sales")}>{stats.sales}</Stat>
            <Stat label={t("last")}>{money(stats.last)}</Stat>
            <Stat label={t("average")}>{money(stats.average)}</Stat>
            <Stat label={t("min")}>{money(stats.min)}</Stat>
            <Stat label={t("max")}>{money(stats.max)}</Stat>
          </div>
          <div className="mt-4 rounded-xl border border-line p-3 bg-surface">
            <PriceChart points={stats.points} average={stats.average} />
          </div>

          <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-fog">
            {t("lastSales", { rarity: rarityLabel(stats.rarity) })}
          </h3>
          {stats.recent.length === 0 ? (
            <p className="mt-3 text-sm text-fog">{t("noSales")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {stats.recent.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="text-fog">{format.dateTime(new Date(s.at), "longTime")}</span>
                  <span className="flex items-center gap-4">
                    {stats.rarity === null && (
                      <span
                        className="text-xs font-bold"
                        style={{ color: RARITY_COLOR[s.rarity] }}
                        title={rarityLabel(s.rarity)}
                      >
                        {RARITIES.find((r) => r.value === s.rarity)!.code}
                      </span>
                    )}
                    <Wikibits amount={s.price} className="font-bold" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </dialog>
  );
}
