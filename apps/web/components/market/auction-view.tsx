"use client";

import { ArrowLeft, LineChart, Minus, Plus } from "@/components/icons";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BID_EXTEND_S,
  BID_EXTEND_WINDOW_S,
  MARKET_FEE_PERCENT,
  sellerProceeds,
  type AuctionDetail,
} from "@wikideck/shared";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { WikibitIcon, Wikibits } from "@/components/wikibit";
import { useRarityLabel } from "@/lib/labels";
import { pollDelay, useLiveEvents, usePushConnected } from "@/lib/push";
import { apiCall, apiFetch } from "@/lib/tags-api";
import { Countdown } from "./countdown";
import { StatsDialog } from "./stats-dialog";

const POLL_MS = 4000;

function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="size-5 rounded-full" />
  ) : (
    <span className="flex size-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const panel = "rounded-xl border border-line p-5 bg-surface";
const label = "text-[10px] font-bold uppercase tracking-[0.2em] text-fog";

export function AuctionView({ initial, apiUrl }: { initial: AuctionDetail; apiUrl: string }) {
  const t = useTranslations("market.auction");
  const format = useFormatter();
  const rarityLabel = useRarityLabel();
  const router = useRouter();
  const [a, setA] = useState(initial);
  const [amount, setAmount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState(false);
  const active = a.status === "ACTIVE";

  const refresh = useCallback(async () => {
    const r = await apiFetch<AuctionDetail>(apiUrl, `/market/${initial.id}`);
    if (r.ok) setA(r.data);
  }, [apiUrl, initial.id]);

  const connected = usePushConnected();
  useLiveEvents(["outbid", "auction"], (e) => {
    if ("auction" in e && e.auction === initial.id) void refresh();
  });
  useEffect(() => {
    if (!active) return;
    const id = setInterval(
      () => {
        if (document.visibilityState === "visible") void refresh();
      },
      pollDelay(connected, POLL_MS),
    );
    return () => clearInterval(id);
  }, [active, refresh, connected]);

  useEffect(() => {
    if (!active) return;
    const left = new Date(a.endsAt).getTime() - Date.now();
    const id = setTimeout(
      async () => {
        await refresh();
        router.refresh();
      },
      Math.max(0, left) + 1500,
    );
    return () => clearTimeout(id);
  }, [active, a.endsAt, refresh, router]);

  const value = amount ?? String(a.minBid);
  const numeric = Number(value);
  const valid = Number.isInteger(numeric) && numeric >= a.minBid;

  async function bid() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const result = await apiCall(apiUrl, `/market/${a.id}/bid`, "POST", { amount: numeric });
    if (!result.ok) setError(result.message);
    else setAmount(null);
    await refresh();
    setBusy(false);
    router.refresh();
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    const result = await apiCall(apiUrl, `/market/${a.id}/cancel`, "POST");
    if (!result.ok) setError(result.message);
    await refresh();
    setBusy(false);
    router.refresh();
  }

  const step = (delta: number) =>
    setAmount(String(Math.max(a.minBid, (Number.isInteger(numeric) ? numeric : a.minBid) + delta)));

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/market"
        className="inline-flex items-center gap-2 text-sm text-pale-mist hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[18rem_1fr]">
        <div>
          <div className={active ? "" : "opacity-70"}>
            <WikiCard card={a.card} className="mx-auto w-64 md:w-full" />
          </div>
          <a
            href={a.card.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-center text-xs text-fog underline hover:text-foreground"
          >
            {t("viewArticle")}
          </a>
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display break-words text-3xl font-medium">{a.card.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fog">
                <span className="rounded-full border border-line px-2 py-px text-[11px] font-bold text-pale-mist">
                  {rarityLabel(a.card.rarity)}
                </span>
                {t("soldBy")} <Avatar name={a.seller.username} url={a.seller.avatarUrl} />
                <Link
                  href={`/profile/${a.seller.id}`}
                  className="font-bold text-pale-mist hover:underline"
                >
                  {a.seller.username}
                </Link>
              </p>
            </div>
            <button
              type="button"
              aria-label={t("marketViewLabel")}
              title={t("marketViewLabel")}
              onClick={() => setStats(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line text-pale-mist transition-colors hover:border-accent hover:text-foreground bg-surface"
            >
              <LineChart className="size-5" />
            </button>
          </div>

          {!active && (
            <div className={`${panel} mt-6 border-accent/30 bg-accent/4`}>
              {a.status === "SOLD" && a.currentBid !== null && (
                <>
                  <p className="font-bold">
                    {a.viewer.isLeader
                      ? t("won")
                      : t("soldTo", { name: a.leader?.username ?? t("aPlayer") })}
                  </p>
                  <p className="mt-1 text-sm text-pale-mist">
                    {t.rich("finalPrice", {
                      amount: () => <Wikibits amount={a.currentBid!} className="font-bold" />,
                    })}
                    {a.viewer.isSeller &&
                      t.rich("received", {
                        fee: MARKET_FEE_PERCENT,
                        amount: () => (
                          <Wikibits amount={sellerProceeds(a.currentBid!)} className="font-bold" />
                        ),
                      })}
                    {a.viewer.isLeader && t("inCollection")}
                  </p>
                </>
              )}
              {a.status === "UNSOLD" && (
                <p className="font-bold">
                  {t("unsold")}
                  <span className="ml-2 text-sm font-normal text-pale-mist">{t("unsoldText")}</span>
                </p>
              )}
              {a.status === "CANCELLED" && (
                <p className="font-bold">{t("cancelledBySeller")}</p>
              )}
            </div>
          )}

          <div className={`${panel} mt-6`}>
            <div className="flex items-center justify-between gap-4">
              <span className={label}>
                {a.currentBid === null ? t("startBid") : active ? t("currentBid") : t("finalBid")}
              </span>
              <Wikibits
                amount={a.currentBid ?? a.startPrice}
                className="text-2xl font-bold"
                iconClass="size-6"
              />
            </div>
            {a.leader && (
              <p className="mt-2 flex items-center justify-end gap-2 text-xs text-fog">
                {active ? t("leading") : t("buyer")}
                <Avatar name={a.leader.username} url={a.leader.avatarUrl} />
                <span className="font-bold text-pale-mist">
                  {a.viewer.isLeader ? t("you") : a.leader.username}
                </span>
              </p>
            )}
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4 text-sm">
              <span className="text-pale-mist">{t("timeLeft")}</span>
              <Countdown endsAt={a.endsAt} className="font-bold" />
            </div>
          </div>

          {active && !a.viewer.isSeller && (
            <div className={`${panel} mt-4`}>
              <div className="flex items-baseline justify-between text-xs text-fog">
                <span>
                  {t.rich("yourBalance", {
                    amount: () => <Wikibits amount={a.wikibits} className="font-bold text-foreground" />,
                  })}
                </span>
                <span>
                  {t.rich("minBid", {
                    amount: a.minBid,
                    strong: (chunks) => <span className="font-bold text-foreground">{chunks}</span>,
                  })}
                </span>
              </div>
              <form
                className="mt-3 flex gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void bid();
                }}
              >
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-line focus-within:border-fog bg-surface">
                  <button
                    type="button"
                    aria-label={t("less")}
                    onClick={() => step(-Math.max(1, Math.round(a.minBid * 0.05)))}
                    className="px-3 py-2.5 text-pale-mist hover:text-foreground"
                  >
                    <Minus className="size-4" />
                  </button>
                  <WikibitIcon className="size-4 shrink-0 text-fog" />
                  <input
                    type="number"
                    inputMode="numeric"
                    aria-label={t("amountLabel")}
                    min={a.minBid}
                    value={value}
                    onChange={(e) => setAmount(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-center font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    aria-label={t("more")}
                    onClick={() => step(Math.max(1, Math.round(a.minBid * 0.05)))}
                    className="px-3 py-2.5 text-pale-mist hover:text-foreground"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!valid || busy || (a.viewer.isLeader && numeric <= (a.currentBid ?? 0))}
                  className={`${primaryButtonClass} px-6`}
                >
                  {busy ? "…" : a.viewer.isLeader ? t("raise") : t("bid")}
                </button>
              </form>
              {error && (
                <p role="alert" className="mt-3 text-xs text-danger">
                  {error}
                </p>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-fog">
                {t("bidRules", { window: BID_EXTEND_WINDOW_S, extend: BID_EXTEND_S })}
              </p>
            </div>
          )}

          {active && a.viewer.isSeller && (
            <div className={`${panel} mt-4`}>
              <p className="text-sm text-pale-mist">
                {t("yourSale", { fee: MARKET_FEE_PERCENT })}
              </p>
              {a.bidCount === 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={cancel}
                  className={`${dangerButtonClass} mt-4`}
                >
                  {t("cancel")}
                </button>
              )}
              {error && (
                <p role="alert" className="mt-3 text-xs text-danger">
                  {error}
                </p>
              )}
            </div>
          )}

          <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-fog">
            {t("history", { count: a.bidCount })}
          </h2>
          {a.bids.length === 0 ? (
            <p className="mt-3 text-sm text-fog">{t("noBids")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {a.bids.map((b, i) => (
                <li
                  key={b.id}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                    i === 0 && active ? "bg-accent/4" : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={b.bidder.username} url={b.bidder.avatarUrl} />
                    <span className="truncate font-bold">{b.bidder.username}</span>
                    <span className="hidden text-xs text-fog sm:inline">
                      {format.dateTime(new Date(b.createdAt), "shortSeconds")}
                    </span>
                  </span>
                  <Wikibits amount={b.amount} className="font-bold" />
                </li>
              ))}
            </ul>
          )}
          {!active && (
            <Link href="/market" className={`${buttonClass} mt-8`}>
              {t("back")}
            </Link>
          )}
        </div>
      </div>

      {stats && (
        <StatsDialog
          apiUrl={apiUrl}
          title={a.card.title}
          initialRarity={a.card.rarity}
          onClose={() => setStats(false)}
        />
      )}
    </div>
  );
}
