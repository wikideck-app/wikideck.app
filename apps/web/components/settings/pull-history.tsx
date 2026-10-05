"use client";

import { ChevronDown } from "@/components/icons";
import { useState } from "react";
import { PULL_HISTORY_SIZE, RARITIES, type PullsResponse } from "@wikideck/shared";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { apiFetch } from "@/lib/tags-api";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

export function PullHistory({ apiUrl }: { apiUrl: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PullsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data) {
      setLoading(true);
      const result = await apiFetch<PullsResponse>(apiUrl, "/me/pulls");
      if (result.ok) setData(result.data);
      else setError(result.message);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="pull-history"
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold">Historique des tirages</span>
          <span className="block text-xs text-fog">
            Les {PULL_HISTORY_SIZE} dernières cartes obtenues en ouvrant des paquets
          </span>
        </span>
        <ChevronDown
          className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div id="pull-history" className="border-t border-line px-4 py-4">
          <p className="mb-4 text-xs leading-relaxed text-fog">
            Transparence : chaque carte est un article Wikipédia tiré au hasard. Sa rareté dépend
            uniquement du nombre de vues de l&apos;article sur les 30 derniers jours (C moins de 50,
            PC dès 50, R dès 250, SR dès 1 000, UR dès 5 000, L dès 20 000). Aucune probabilité
            n&apos;est truquée ni modifiée.
          </p>

          {loading && <p className="text-sm text-fog">Chargement…</p>}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {data && data.openings.length === 0 && (
            <p className="text-sm text-fog">Aucun tirage pour le moment. Ouvrez un paquet !</p>
          )}
          {data && data.openings.length > 0 && (
            <>
              <ol className="space-y-4">
                {data.openings.map((opening) => (
                  <li key={opening.id}>
                    <p className="text-xs font-bold uppercase tracking-wide text-fog">
                      {dateFormat.format(new Date(opening.openedAt))}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {opening.cards.map((card, i) => {
                        const rarity = RARITIES.find((r) => r.value === card.rarity)!;
                        return (
                          <li key={`${card.cardId}-${i}`}>
                            <a
                              href={card.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs hover:border-accent"
                            >
                              <b style={{ color: RARITY_COLOR[card.rarity] }} title={rarity.label}>
                                {rarity.code}
                              </b>
                              <span className="max-w-[16rem] truncate">{card.title}</span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-fog">
                {data.total} carte{data.total > 1 ? "s" : ""} tirée{data.total > 1 ? "s" : ""} au
                total depuis la création du compte.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
