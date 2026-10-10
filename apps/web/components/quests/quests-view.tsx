"use client";

import { Check, ChevronDown, ChevronRight, Gift } from "@/components/icons";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuestClaimResponse, QuestDto, QuestKind, QuestsResponse } from "@wikideck/shared";
import { Wikibits, WikibitIcon } from "@/components/wikibit";
import { apiCall } from "@/lib/tags-api";

const GROUPS: { kind: QuestKind; emoji: string }[] = [
  { kind: "wikipedia_cards", emoji: "📚" },
  { kind: "anime_cards", emoji: "🎬" },
];

export function QuestsView({ initial, apiUrl }: { initial: QuestsResponse; apiUrl: string }) {
  const t = useTranslations("quests");
  const tt = useTranslations("titles");
  const format = useFormatter();
  const router = useRouter();
  const [quests, setQuests] = useState(initial.quests);
  const [wikibits, setWikibits] = useState(initial.wikibits);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState<Set<QuestKind>>(new Set());
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const claimable = quests.filter((q) => q.claimable);
  const done = quests.filter((q) => q.claimed).length;
  const percent = quests.length ? Math.round((done / quests.length) * 100) : 0;

  async function claim(list: QuestDto[]) {
    setBusy(true);
    setNotice(null);
    let total = 0;
    for (const q of list) {
      const res = await apiCall<QuestClaimResponse>(
        apiUrl,
        `/quests/${encodeURIComponent(q.id)}/claim`,
        "POST",
      );
      if (!res.ok) {
        setNotice({ ok: false, text: res.message });
        break;
      }
      total += res.data.reward;
      setWikibits(res.data.wikibits);
      setQuests((prev) =>
        prev.map((x) => (x.id === q.id ? { ...x, claimed: true, claimable: false } : x)),
      );
    }
    setBusy(false);
    if (total > 0) {
      setNotice({ ok: true, text: t("claimedNotice", { amount: total }) });
      router.refresh();
    }
  }

  const nameOf = (q: QuestDto) =>
    tt(`${q.kind === "anime_cards" ? "animeNames" : "names"}.${q.titleKey}` as never);

  return (
    <>
      {/* résumé : solde, progression globale, récompenses à récupérer */}
      <section className="mt-6 grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-8">
        <div className="flex items-center gap-4">
          <WikibitIcon className="size-12" />
          <div>
            <p className="text-xs text-fog">{t("balanceLabel")}</p>
            <p className="font-display text-3xl font-medium tabular-nums">
              {format.number(wikibits)}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("summary", { done, total: quests.length })}</p>
          <div className="mt-2 flex items-center gap-3">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10"
            >
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs font-bold tabular-nums text-fog">{percent} %</span>
          </div>
        </div>

        <button
          type="button"
          disabled={busy || claimable.length === 0}
          onClick={() => void claim(claimable)}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-default ${
            claimable.length > 0
              ? "border-accent bg-accent/10 hover:bg-accent/20"
              : "border-line text-fog"
          }`}
        >
          <Gift className={`size-8 shrink-0 ${claimable.length > 0 ? "text-accent" : ""}`} />
          <span className="text-sm font-bold">
            {claimable.length > 0 ? t("toClaim", { count: claimable.length }) : t("nothingToClaim")}
            {claimable.length > 0 && (
              <span className="block text-xs font-normal text-pale-mist">{t("claimAll")}</span>
            )}
          </span>
          {claimable.length > 0 && <ChevronRight className="size-4 shrink-0" />}
        </button>
      </section>

      {notice && (
        <p
          role="status"
          className={`mt-4 text-center text-sm ${notice.ok ? "text-success" : "text-danger"}`}
        >
          {notice.text}
        </p>
      )}

      {GROUPS.map(({ kind, emoji }) => {
        const list = quests.filter((q) => q.kind === kind);
        const finished = list.filter((q) => q.claimed).length;
        const isClosed = closed.has(kind);
        const anime = kind === "anime_cards";
        return (
          <section key={kind} className="mt-6 rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <button
              type="button"
              aria-expanded={!isClosed}
              onClick={() =>
                setClosed((prev) => {
                  const next = new Set(prev);
                  if (next.has(kind)) next.delete(kind);
                  else next.add(kind);
                  return next;
                })
              }
              className="flex w-full items-center gap-4 text-left"
            >
              <span aria-hidden className="flex size-12 items-center justify-center rounded-xl bg-foreground/5 text-2xl">
                {emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl font-medium">
                  {t(anime ? "sections.anime" : "sections.wikipedia")}
                </span>
                <span className="block text-sm text-pale-mist">
                  {t(anime ? "sectionHintAnime" : "sectionHintWikipedia")}
                </span>
              </span>
              <span className="hidden rounded-full border border-line px-3 py-1 text-xs font-semibold sm:inline">
                {t("finished", { done: finished, total: list.length })}
              </span>
              <ChevronDown
                className={`size-5 shrink-0 transition-transform ${isClosed ? "-rotate-90" : ""}`}
              />
            </button>

            {!isClosed && (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {list.map((q) => {
                  const ratio = Math.min(1, q.progress / q.target);
                  return (
                    <li
                      key={q.id}
                      className={`flex flex-col rounded-xl border p-4 transition-colors ${
                        q.claimable
                          ? "border-accent bg-accent/5 shadow-[0_0_28px_-10px] shadow-accent"
                          : "border-line bg-background/40"
                      } ${q.claimed ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-2xl">
                          {q.emoji}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold leading-tight">{nameOf(q)}</h3>
                          <p className="mt-0.5 text-xs text-fog">
                            {t(anime ? "descriptionAnime" : "description", {
                              target: format.number(q.target),
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold tabular-nums">
                          {format.number(q.progress)} / {format.number(q.target)}
                        </p>
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(ratio * 100)}
                          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
                        >
                          <div
                            className="h-full rounded-full bg-accent transition-[width] duration-500"
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                        <Wikibits amount={q.reward} className="text-sm font-bold" iconClass="size-5" />
                        {q.claimed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                            <Check className="size-4" /> {t("claimed")}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!q.claimable || busy}
                            onClick={() => void claim([q])}
                            className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors disabled:cursor-default ${
                              q.claimable
                                ? "bg-accent text-accent-foreground hover:bg-accent/70"
                                : "bg-foreground/10 text-fog"
                            }`}
                          >
                            {q.claimable ? t("claim") : t("locked")}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
