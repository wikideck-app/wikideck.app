"use client";

import { useConfirm } from "@/components/confirm-dialog";
import { Crown, Gift, LogOut, Plus, Trophy, X } from "@/components/icons";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GUILD_IP_POINTS,
  GUILD_MAX_MEMBERS,
  GUILD_PARTICIPATION_REWARD,
  GUILD_REWARDS,
  DROP_RARITIES,
  type CatalogCard,
  type GuildHome,
  type RankingResponse,
  type WishesResponse,
} from "@wikideck/shared";
import { Countdown } from "@/components/market/countdown";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { Wikibits } from "@/components/wikibit";
import { useRarityLabel } from "@/lib/labels";
import { apiCall, apiFetch } from "@/lib/tags-api";
import { CatalogPicker } from "./catalog-picker";

type Tab = "home" | "wishes" | "ranking";
const TABS: Tab[] = ["home", "wishes", "ranking"];

const panel = "rounded-xl border border-line p-5 bg-surface";
const heading = "text-xs font-bold uppercase tracking-[0.2em] text-fog";

function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="size-7 rounded-full" />
  ) : (
    <span className="flex size-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3 bg-surface">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fog">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{children}</p>
    </div>
  );
}

function HomeTab({ home, apiUrl }: { home: GuildHome; apiUrl: string }) {
  const t = useTranslations("guild");
  const format = useFormatter();
  const rarityLabel = useRarityLabel();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isOwner = home.role === "OWNER";
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function leave() {
    const ok = await confirm({
      title: t("home.leaveTitle"),
      message: t("home.leaveMessage"),
      confirmLabel: t("home.leave"),
      danger: true,
    });
    if (!ok) return;
    const r = await apiCall(apiUrl, "/guild/leave", "POST");
    if (!r.ok) return setError(r.message);
    router.refresh();
  }
  async function kick(userId: string, name: string) {
    const ok = await confirm({
      title: t("home.kickTitle", { name }),
      confirmLabel: t("home.kick"),
      danger: true,
    });
    if (!ok) return;
    const r = await apiCall(apiUrl, `/guild/members/${userId}`, "DELETE");
    if (!r.ok) return setError(r.message);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <p className="text-sm text-pale-mist">
        {t("home.intro")}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("home.rank")}>
          {home.rank === null ? "—" : `${home.rank}`}
          <span className="text-sm font-medium text-fog">
            {home.rank === null ? "" : t("home.rankOf", { count: home.guilds })}
          </span>
        </Stat>
        <Stat label={t("home.guildPoints")}>{format.number(home.points)}</Stat>
        <Stat label={t("home.myWeek")}>{t("pts", { count: home.me.ipWeek })}</Stat>
        <Stat label={t("home.lifetime")}>{t("pts", { count: home.me.ipTotal })}</Stat>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className={panel}>
          <h2 className={heading}>
            {t("home.members", { count: home.members.length, max: GUILD_MAX_MEMBERS })}
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {home.members.map((m) => (
              <li key={m.player.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.player.username} url={m.player.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-bold">
                    <Link href={`/profile/${m.player.id}`} className="hover:underline">
                      {m.player.username}
                    </Link>
                    {m.role === "OWNER" && (
                      <Crown className="size-3.5 text-pale-mist" aria-label={t("home.owner")} />
                    )}
                  </p>
                  <p className="text-xs text-fog">
                    {t("home.memberStats", { week: m.ipWeek, total: m.ipTotal })}
                  </p>
                </div>
                {isOwner && m.role !== "OWNER" && (
                  <button
                    type="button"
                    aria-label={t("home.kickLabel", { name: m.player.username })}
                    onClick={() => kick(m.player.id, m.player.username)}
                    className="opacity-50 hover:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className={panel}>
            <h2 className={heading}>{t("home.weekScore")}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-pale-mist">{t("home.solidarity")}</dt>
                <dd className="font-bold tabular-nums">{format.number(home.influence)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-pale-mist">{t("home.auctions")}</dt>
                <dd className="font-bold tabular-nums">{format.number(home.auctions)}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-xs text-fog">
              {t.rich("home.weekEnds", {
                time: () => <Countdown endsAt={home.weekEndsAt} className="font-bold text-foreground" />,
              })}
            </p>
          </section>
          {home.lastWeek && (
            <section className={panel}>
              <h2 className={heading}>{t("home.lastWeek")}</h2>
              <p className="mt-3 text-sm">
                {t.rich("home.lastWeekRank", {
                  rank: home.lastWeek.rank,
                  points: home.lastWeek.points,
                  sup: (chunks) => <sup>{chunks}</sup>,
                  b: (chunks) => <span className="font-bold">{chunks}</span>,
                })}
              </p>
              {home.lastWeek.reward > 0 && (
                <p className="mt-1 text-xs text-fog">
                  {t.rich("home.lastWeekReward", {
                    amount: () => (
                      <Wikibits amount={home.lastWeek!.reward} className="font-bold text-foreground" />
                    ),
                  })}
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      <section className={panel}>
        <h2 className={heading}>{t("home.solidarityTitle")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pale-mist">
          {t("home.solidarityText")}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {DROP_RARITIES.map((r) => (
            <li
              key={r.value}
              className="rounded-xl border border-line px-3 py-2 text-sm bg-surface"
            >
              <span className="block text-xs text-fog">{rarityLabel(r.value)}</span>
              <span className="font-bold tabular-nums">
                {t("home.points", { count: GUILD_IP_POINTS[r.value] })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="button" onClick={leave} className={`${buttonClass} text-pale-mist`}>
        <LogOut className="size-4" /> {t("home.leaveButton")}
      </button>
    </div>
  );
}

function WishesTab({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("guild");
  const tc = useTranslations("common");
  const router = useRouter();
  const [data, setData] = useState<WishesResponse | null>(null);
  const [picking, setPicking] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch<WishesResponse>(apiUrl, "/guild/wishes");
    if (r.ok) setData(r.data);
    else setError(r.message);
  }, [apiUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function wish(card: CatalogCard) {
    setError(null);
    const r = await apiCall(apiUrl, "/guild/wishes", "POST", { cardId: card.id });
    if (!r.ok) setError(r.message);
    await load();
  }

  async function cancel(id: string) {
    setBusyId(id);
    const r = await apiCall(apiUrl, `/guild/wishes/${id}`, "DELETE");
    if (!r.ok) setError(r.message);
    setBusyId(null);
    await load();
  }

  async function gift(id: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    const r = await apiCall<{ points: number }>(apiUrl, `/guild/wishes/${id}/gift`, "POST");
    if (!r.ok) setError(r.message);
    else
      setNotice(t("wishes.gifted", { points: r.data.points }));
    setBusyId(null);
    await load();
    router.refresh();
  }

  if (!data) {
    return <p className="py-10 text-center text-sm text-fog">{error ?? tc("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-pale-mist">
        {t("wishes.intro")}
      </p>

      <section className={panel}>
        <h2 className={heading}>{t("wishes.mine")}</h2>
        {data.mine ? (
          <div className="mt-4 flex items-center gap-5">
            <div className="w-28 shrink-0">
              <WikiCard card={data.mine.card} compact />
            </div>
            <div>
              <p className="font-bold">{data.mine.card.title}</p>
              <p className="mt-1 text-sm text-pale-mist">
                {t("wishes.waiting")}
              </p>
              <button
                type="button"
                disabled={busyId === data.mine.id}
                onClick={() => cancel(data.mine!.id)}
                className={`${buttonClass} mt-3`}
              >
                {t("wishes.withdraw")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-pale-mist">{t("wishes.none")}</p>
            <button
              type="button"
              className={`${primaryButtonClass} mt-3`}
              onClick={() => setPicking(true)}
            >
              <Plus className="size-4" /> {t("wishes.wish")}
            </button>
          </div>
        )}
        {data.receivedToday && (
          <p className="mt-4 text-xs text-fog">
            {t.rich("wishes.receivedToday", {
              time: () => <Countdown endsAt={data.resetsAt} className="font-bold text-foreground" />,
            })}
          </p>
        )}
      </section>

      <section>
        <h2 className={heading}>{t("wishes.mates")}</h2>
        {data.wishes.length === 0 ? (
          <p className="mt-4 text-sm text-fog">{t("wishes.noWishes")}</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.wishes.map((w) => (
              <li key={w.id} className={`${panel} flex gap-4`}>
                <div className="w-24 shrink-0">
                  <WikiCard card={w.card} compact />
                </div>
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-sm font-bold">{w.card.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fog">
                    <Avatar name={w.player.username} url={w.player.avatarUrl} />
                    {w.player.username}
                  </p>
                  <p className="mt-2 text-xs text-pale-mist">
                    {t("wishes.solidarityPoints", { points: GUILD_IP_POINTS[w.card.rarity] })}
                  </p>
                  <div className="mt-auto pt-3">
                    {w.canGift ? (
                      <button
                        type="button"
                        disabled={busyId === w.id}
                        onClick={() => gift(w.id)}
                        className={primaryButtonClass}
                      >
                        <Gift className="size-4" /> {t("wishes.gift")}
                      </button>
                    ) : (
                      <span className="text-xs text-fog">{t("wishes.notOwned")}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {notice && <p className="text-sm text-pale-mist">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {picking && (
        <CatalogPicker apiUrl={apiUrl} onSelect={wish} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}

function RankingTab({ apiUrl }: { apiUrl: string }) {
  const t = useTranslations("guild");
  const tc = useTranslations("common");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void apiFetch<RankingResponse>(apiUrl, "/guild/ranking").then((r) =>
      r.ok ? setData(r.data) : setError(r.message),
    );
  }, [apiUrl]);

  if (!data) return <p className="py-10 text-center text-sm text-fog">{error ?? tc("loading")}</p>;

  const row = (e: RankingResponse["entries"][number]) => (
    <li
      key={e.guildId}
      className={`flex items-center gap-4 px-4 py-3 text-sm ${e.isMine ? "bg-accent/6" : ""}`}
    >
      <span className="w-8 text-center font-bold tabular-nums text-pale-mist">{e.rank}</span>
      <span className="min-w-0 flex-1 truncate font-bold">
        {e.name}
        {e.isMine && <span className="ml-2 text-xs font-normal text-fog">{t("ranking.yours")}</span>}
      </span>
      <span className="hidden text-xs text-fog sm:inline">{t("ranking.members", { count: e.members })}</span>
      <span className="w-24 text-right font-bold tabular-nums">{t("pts", { count: e.points })}</span>
    </li>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-pale-mist">
        {t.rich("ranking.intro", {
          time: () => <Countdown endsAt={data.weekEndsAt} className="font-bold text-foreground" />,
        })}
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section>
          <h2 className={heading}>{t("ranking.thisWeek")}</h2>
          {data.entries.length === 0 ? (
            <p className="mt-4 text-sm text-fog">{t("ranking.none")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {data.entries.map(row)}
              {data.mine && <li className="px-4 py-1 text-center text-fog">…</li>}
              {data.mine && row(data.mine)}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className={panel}>
            <h2 className={heading}>{t("ranking.rewards")}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {GUILD_REWARDS.map((r) => (
                <li key={r.rank} className="flex justify-between">
                  <span className="text-pale-mist">{t("ranking.rewardRank", { rank: r.rank })}</span>
                  <Wikibits amount={r.wikibits} className="font-bold" />
                </li>
              ))}
              <li className="flex justify-between border-t border-line pt-2">
                <span className="text-pale-mist">{t("ranking.others")}</span>
                <Wikibits amount={GUILD_PARTICIPATION_REWARD} className="font-bold" />
              </li>
            </ul>
            <p className="mt-3 text-xs text-fog">{t("ranking.perMember")}</p>
          </section>
          <section className={panel}>
            <h2 className={`${heading} flex items-center gap-2`}>
              <Trophy className="size-3.5" /> {t("ranking.lastWeek")}
            </h2>
            {data.lastWeek.entries.length === 0 ? (
              <p className="mt-3 text-sm text-fog">{t("ranking.noResults")}</p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {data.lastWeek.entries.map((e) => (
                  <li key={e.rank} className="flex items-baseline justify-between gap-3">
                    <span className="truncate">
                      <span className="mr-2 font-bold tabular-nums text-pale-mist">{e.rank}</span>
                      {e.name}
                    </span>
                    <span className="text-xs tabular-nums text-fog">
                      {t("pts", { count: e.points })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function GuildView({ home, apiUrl }: { home: GuildHome; apiUrl: string }) {
  const t = useTranslations("guild");
  const [tab, setTab] = useState<Tab>("home");
  const tablist = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="mt-8 text-center">
        <h2 className="font-display text-3xl font-medium">{home.guild.name}</h2>
        {home.guild.description && (
          <p className="prose-serif mt-1 text-pale-mist">{home.guild.description}</p>
        )}
      </div>
      <div ref={tablist} role="tablist" className="mt-8 flex gap-2 border-b border-line">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              tab === id
                ? "border-accent text-foreground"
                : "border-transparent text-fog hover:text-foreground"
            }`}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "home" && <HomeTab home={home} apiUrl={apiUrl} />}
        {tab === "wishes" && <WishesTab apiUrl={apiUrl} />}
        {tab === "ranking" && <RankingTab apiUrl={apiUrl} />}
      </div>
    </div>
  );
}
