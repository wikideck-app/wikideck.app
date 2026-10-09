"use client";

import { ArrowLeftRight, Ban, Check, Hourglass, Plus, X, type IconType } from "@/components/icons";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PlayerSummary,
  TradeBox,
  TradeCard,
  TradeDto,
  TradesResponse,
} from "@wikideck/shared";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { sfx } from "@/lib/audio";
import { useLiveEvents } from "@/lib/push";
import { apiCall, apiFetch } from "@/lib/tags-api";
import { ComposeDialog } from "./compose-dialog";

const currentTime = () => Date.now();

const TABS: TradeBox[] = ["incoming", "outgoing", "history"];

const STATUS: Record<TradeDto["status"], { icon: IconType; tone: string }> = {
  PENDING: { icon: Hourglass, tone: "border-accent/40 bg-accent/5" },
  ACCEPTED: { icon: Check, tone: "border-accent bg-accent text-accent-foreground" },
  DECLINED: { icon: X, tone: "border-danger/60 bg-danger/10 text-danger" },
  CANCELLED: { icon: Ban, tone: "border-line text-fog" },
  COUNTERED: { icon: ArrowLeftRight, tone: "border-line text-fog" },
  EXPIRED: { icon: Hourglass, tone: "border-line text-fog" },
};

function StatusBadge({ trade }: { trade: TradeDto }) {
  const t = useTranslations("trades");
  const format = useFormatter();
  const { icon: Icon, tone } = STATUS[trade.status];
  const expires = new Date(trade.expiresAt);
  const now = currentTime();
  const remaining =
    expires.getTime() <= now
      ? t("expiresSoon")
      : t("expires", { time: format.relativeTime(expires, now) });
  const pending = trade.status === "PENDING";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border py-1 pl-2.5 pr-3.5 text-xs font-bold ${tone}`}
    >
      {pending ? (
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-70" />
          <span className="relative size-2 rounded-full bg-accent" />
        </span>
      ) : (
        <Icon aria-hidden className="size-3.5" strokeWidth={3} />
      )}
      {t(`status.${trade.status}`)}
      {pending && (
        <span suppressHydrationWarning className="font-medium text-pale-mist">
          · {remaining}
        </span>
      )}
    </span>
  );
}

const SWAP_MS = 2200;

function CardStrip({
  title,
  cards,
  side,
}: {
  title: string;
  cards: TradeCard[];
  side: "left" | "right";
}) {
  const t = useTranslations("trades");
  const count = cards.reduce((n, c) => n + c.quantity, 0);
  const size =
    cards.length > 4 ? "w-28 sm:w-32" : cards.length > 2 ? "w-32 sm:w-36" : "w-36 sm:w-44";
  return (
    <section
      className={`trade-side-${side} min-w-0 rounded-2xl border border-line bg-accent/3 px-5 pb-5 pt-4`}
    >
      <h4 className="flex items-baseline justify-between text-xs font-bold uppercase tracking-[0.15em] text-fog">
        {title}
        <span className="tabular-nums">
          {t("cards", { count })}
        </span>
      </h4>
      {cards.length === 0 ? (
        <p className="py-16 text-center text-sm text-fog">{t("nothing")}</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-4 pb-2 pt-3">
          {cards.map((c, i) => (
            <li
              key={c.id}
              className={`trade-card ${size}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <WikiCard card={c} quantity={c.quantity} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Versus({ burst }: { burst: boolean }) {
  return (
    <span
      aria-hidden
      className="trade-orb pointer-events-none absolute left-1/2 top-1/2 z-10 hidden size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground ring-8 ring-black transition-transform duration-500 sm:flex"
    >
      <ArrowLeftRight className="size-5" />
      {burst && <i className="trade-burst absolute inset-0 rounded-full border-2 border-accent" />}
    </span>
  );
}

function TradeRow({
  trade,
  index,
  busy,
  swapping,
  onAct,
  onCounter,
}: {
  trade: TradeDto;
  index: number;
  busy: boolean;
  swapping: boolean;
  onAct: (action: "accept" | "decline" | "cancel") => void;
  onCounter: () => void;
}) {
  const t = useTranslations("trades");
  const format = useFormatter();
  const p = trade.counterparty;
  const row = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = row.current;
    if (!swapping || !el) return;
    const left = el.querySelector<HTMLElement>(".trade-side-left");
    const right = el.querySelector<HTMLElement>(".trade-side-right");
    if (left && right) el.style.setProperty("--dx", `${right.offsetLeft - left.offsetLeft}px`);
  }, [swapping]);

  return (
    <li
      ref={row}
      data-swap={swapping || undefined}
      className="trade-row warp-in relative overflow-hidden rounded-xl border border-line p-6 transition-colors hover:border-accent bg-surface"
      style={{ "--i": index } as React.CSSProperties}
    >
      {swapping && (
        <span aria-hidden className="trade-flash pointer-events-none absolute inset-0 bg-accent" />
      )}
      {trade.status === "PENDING" && (
        <span aria-hidden className="absolute inset-x-0 top-0 h-px overflow-hidden">
          <i className="trade-glint absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-accent to-transparent" />
        </span>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatarUrl} alt="" className="size-8 rounded-full" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-accent/10 text-sm font-bold">
              {p.username.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-sm font-bold">
              {t.rich(trade.role === "recipient" ? "proposes" : "youTo", {
                player: () => (
                  <Link href={`/profile/${p.id}`} className="hover:underline">
                    {p.username}
                  </Link>
                ),
              })}
            </p>
            <p className="text-xs text-fog">
              {format.dateTime(new Date(trade.createdAt), "mediumTime")}
              {trade.counter && (
                <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                  {t("counterBadge")}
                </span>
              )}
            </p>
          </div>
        </div>
        <StatusBadge trade={swapping ? { ...trade, status: "ACCEPTED" } : trade} />
      </div>

      <div className="relative mt-6 grid gap-4 sm:grid-cols-2 sm:gap-8">
        <CardStrip title={t("give")} cards={trade.give} side="left" />
        <CardStrip title={t("receive")} cards={trade.receive} side="right" />
        <Versus burst={swapping} />
      </div>

      {trade.status === "PENDING" && !swapping && (
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {trade.role === "recipient" ? (
            <>
              <button
                type="button"
                disabled={busy}
                className={buttonClass}
                onClick={() => onAct("decline")}
              >
                {t("decline")}
              </button>
              <button type="button" disabled={busy} className={buttonClass} onClick={onCounter}>
                {t("counterAction")}
              </button>
              <button
                type="button"
                disabled={busy}
                className={primaryButtonClass}
                onClick={() => onAct("accept")}
              >
                {t("accept")}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              className={dangerButtonClass}
              onClick={() => onAct("cancel")}
            >
              {t("cancel")}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function TradesView({
  apiUrl,
  initial,
  initialRecipient,
}: {
  apiUrl: string;
  initial: TradeDto[] | null;
  initialRecipient?: PlayerSummary;
}) {
  const t = useTranslations("trades");
  const tc = useTranslations("common");
  const router = useRouter();
  const [box, setBox] = useState<TradeBox>("incoming");
  const [trades, setTrades] = useState<TradeDto[] | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [composing, setComposing] = useState(!!initialRecipient);
  const [counterOf, setCounterOf] = useState<TradeDto | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (target: TradeBox) => {
      const id = ++requestId.current;
      const result = await apiFetch<TradesResponse>(apiUrl, `/trades?box=${target}`);
      if (id !== requestId.current) return;
      if (result.ok) {
        setTrades(result.data.trades);
        setError(null);
      } else setError(result.message);
    },
    [apiUrl],
  );

  const hasInitial = useRef(initial !== null);
  useEffect(() => {
    if (hasInitial.current) {
      hasInitial.current = false;
      return;
    }
    setTrades(null);
    void load(box);
  }, [box, load]);

  useLiveEvents(["trade"], () => void load(box));

  async function act(trade: TradeDto, action: "accept" | "decline" | "cancel") {
    setBusyId(trade.id);
    setError(null);
    const result = await apiCall(apiUrl, `/trades/${trade.id}/${action}`, "POST");
    if (!result.ok) {
      setError(
        result.code && t.has(`errors.${result.code}` as never)
          ? t(`errors.${result.code}` as never)
          : result.message,
      );
    }
    if (result.ok && action === "accept") {
      setSwappingId(trade.id);
      sfx.trade();
      await new Promise((r) => setTimeout(r, SWAP_MS));
    }
    await load(box);
    setSwappingId(null);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-medium">{t("title")}</h1>
          <p className="prose-serif mt-2 text-pale-mist">
            {t("subtitle")}
          </p>
        </div>
        <button type="button" className={primaryButtonClass} onClick={() => setComposing(true)}>
          <Plus className="size-4" /> {t("propose")}
        </button>
      </div>

      <div role="tablist" className="mt-8 flex gap-2 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={box === tab}
            onClick={() => setBox(tab)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              box === tab
                ? "border-accent text-foreground"
                : "border-transparent text-fog hover:text-foreground"
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6">
        {trades === null ? (
          <p className="py-10 text-center text-sm text-fog">{tc("loading")}</p>
        ) : trades.length === 0 ? (
          <p className="py-10 text-center text-sm text-fog">
            {t(`emptyBox.${box}`)}
          </p>
        ) : (
          <ul key={box} className="flex flex-col gap-5">
            {trades.map((trade, i) => (
              <TradeRow
                key={trade.id}
                trade={trade}
                index={i}
                busy={busyId === trade.id}
                swapping={swappingId === trade.id}
                onAct={(a) => act(trade, a)}
                onCounter={() => setCounterOf(trade)}
              />
            ))}
          </ul>
        )}
      </div>

      {counterOf && (
        <ComposeDialog
          key={counterOf.id}
          apiUrl={apiUrl}
          counterOf={counterOf}
          onClose={() => setCounterOf(null)}
          onCreated={() => {
            setCounterOf(null);
            setBox("outgoing");
            void load("outgoing");
            router.refresh();
          }}
        />
      )}
      {composing && (
        <ComposeDialog
          apiUrl={apiUrl}
          initialRecipient={initialRecipient}
          onClose={() => setComposing(false)}
          onCreated={() => {
            setBox("outgoing");
            void load("outgoing");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
