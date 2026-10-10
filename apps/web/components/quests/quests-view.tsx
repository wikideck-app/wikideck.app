"use client";

import { Check } from "@/components/icons";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuestClaimResponse, QuestDto, QuestKind, QuestsResponse } from "@wikideck/shared";
import { primaryButtonClass } from "@/components/settings/controls";
import { Wikibits } from "@/components/wikibit";
import { apiCall } from "@/lib/tags-api";

const GROUPS: QuestKind[] = ["wikipedia_cards", "anime_cards"];

export function QuestsView({ initial, apiUrl }: { initial: QuestsResponse; apiUrl: string }) {
  const t = useTranslations("quests");
  const tt = useTranslations("titles");
  const format = useFormatter();
  const router = useRouter();
  const [quests, setQuests] = useState(initial.quests);
  const [wikibits, setWikibits] = useState(initial.wikibits);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const claimable = quests.filter((q) => q.claimable).length;
  const done = quests.filter((q) => q.claimed).length;

  async function claim(q: QuestDto) {
    setBusy(q.id);
    setNotice(null);
    const res = await apiCall<QuestClaimResponse>(
      apiUrl,
      `/quests/${encodeURIComponent(q.id)}/claim`,
      "POST",
    );
    setBusy(null);
    if (!res.ok) return setNotice({ ok: false, text: res.message });
    setWikibits(res.data.wikibits);
    setQuests((prev) =>
      prev.map((x) => (x.id === q.id ? { ...x, claimed: true, claimable: false } : x)),
    );
    setNotice({ ok: true, text: t("claimedNotice", { amount: res.data.reward }) });
    router.refresh();
  }

  const nameOf = (q: QuestDto) =>
    tt(`${q.kind === "anime_cards" ? "animeNames" : "names"}.${q.titleKey}` as never);

  return (
    <>
      <p className="mt-3 text-center text-sm text-fog">
        {t.rich("balance", {
          amount: () => <Wikibits amount={wikibits} className="font-bold text-foreground" />,
        })}
        {" · "}
        {t("summary", { done, total: quests.length })}
        {claimable > 0 && (
          <span className="ml-2 font-bold text-accent">{t("toClaim", { count: claimable })}</span>
        )}
      </p>
      {notice && (
        <p
          role="status"
          className={`mt-4 text-center text-sm ${notice.ok ? "text-success" : "text-danger"}`}
        >
          {notice.text}
        </p>
      )}

      {GROUPS.map((kind) => (
        <section key={kind} className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-fog">
            {t(kind === "anime_cards" ? "sections.anime" : "sections.wikipedia")}
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {quests
              .filter((q) => q.kind === kind)
              .map((q) => {
                const ratio = Math.min(1, q.progress / q.target);
                return (
                  <li
                    key={q.id}
                    className={`rounded-xl border bg-surface p-4 sm:p-5 ${
                      q.claimable ? "border-accent" : "border-line"
                    } ${q.claimed ? "opacity-60" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                      <span aria-hidden className="text-3xl">
                        {q.emoji}
                      </span>
                      <div className="min-w-48 flex-1">
                        <h3 className="font-bold">{t("questTitle", { name: nameOf(q) })}</h3>
                        <p className="text-xs text-fog">
                          {t(kind === "anime_cards" ? "progressAnime" : "progress", {
                            current: format.number(q.progress),
                            target: format.number(q.target),
                          })}
                        </p>
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(ratio * 100)}
                          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
                        >
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Wikibits amount={q.reward} className="text-lg font-bold" iconClass="size-5" />
                        {q.claimed ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                            <Check className="size-4" /> {t("claimed")}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={primaryButtonClass}
                            disabled={!q.claimable || busy !== null}
                            onClick={() => void claim(q)}
                          >
                            {q.claimable ? t("claim") : t("locked")}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </>
  );
}
