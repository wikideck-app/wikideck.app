"use client";

import { ArrowLeftRight, Ban, Check, Hourglass, Plus, X, type IconType } from "@/components/icons";
import Link from "next/link";
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

const TABS: { box: TradeBox; label: string }[] = [
  { box: "incoming", label: "Reçues" },
  { box: "outgoing", label: "Envoyées" },
  { box: "history", label: "Historique" },
];

const STATUS: Record<TradeDto["status"], { label: string; icon: IconType; tone: string }> = {
  PENDING: { label: "En attente", icon: Hourglass, tone: "border-accent/40 bg-accent/5" },
  ACCEPTED: {
    label: "Acceptée",
    icon: Check,
    tone: "border-accent bg-accent text-accent-foreground",
  },
  DECLINED: { label: "Refusée", icon: X, tone: "border-danger/60 bg-danger/10 text-danger" },
  CANCELLED: { label: "Annulée", icon: Ban, tone: "border-line text-fog" },
  EXPIRED: { label: "Expirée", icon: Hourglass, tone: "border-line text-fog" },
};

function remaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expire bientôt";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "expire dans moins d'1 h";
  return hours < 48 ? `expire dans ${hours} h` : `expire dans ${Math.floor(hours / 24)} j`;
}

function StatusBadge({ trade }: { trade: TradeDto }) {
  const { label, icon: Icon, tone } = STATUS[trade.status];
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
      {label}
      {pending && (
        <span suppressHydrationWarning className="font-medium text-pale-mist">
          · {remaining(trade.expiresAt)}
        </span>
      )}
    </span>
  );
}

const ERRORS: Record<string, string> = {
  not_available: "Une des cartes n'est plus disponible : l'échange n'a pas eu lieu.",
  already_resolved: "Cette proposition a déjà été traitée.",
  expired: "Cette proposition a expiré.",
  busy: "Le serveur est occupé, réessayez.",
};

const SWAP_MS = 2200;

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function CardStrip({
  title,
  cards,
  side,
}: {
  title: string;
  cards: TradeCard[];
  side: "left" | "right";
}) {
  const size =
    cards.length > 4 ? "w-28 sm:w-32" : cards.length > 2 ? "w-32 sm:w-36" : "w-36 sm:w-44";
  return (
    <section
      className={`trade-side-${side} min-w-0 rounded-2xl border border-line bg-accent/3 px-5 pb-5 pt-4`}
    >
      <h4 className="flex items-baseline justify-between text-xs font-bold uppercase tracking-[0.15em] text-fog">
        {title}
        <span className="tabular-nums">
          {cards.reduce((n, c) => n + c.quantity, 0)} carte
          {cards.reduce((n, c) => n + c.quantity, 0) > 1 ? "s" : ""}
        </span>
      </h4>
      {cards.length === 0 ? (
        <p className="py-16 text-center text-sm text-fog">Rien</p>
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
}: {
  trade: TradeDto;
  index: number;
  busy: boolean;
  swapping: boolean;
  onAct: (action: "accept" | "decline" | "cancel") => void;
}) {
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
              {trade.role === "recipient" ? (
                <>
                  <Link href={`/profile/${p.id}`} className="hover:underline">
                    {p.username}
                  </Link>{" "}
                  vous propose
                </>
              ) : (
                <>
                  Vous →{" "}
                  <Link href={`/profile/${p.id}`} className="hover:underline">
                    {p.username}
                  </Link>
                </>
              )}
            </p>
            <p className="text-xs text-fog">{dateFmt.format(new Date(trade.createdAt))}</p>
          </div>
        </div>
        <StatusBadge trade={swapping ? { ...trade, status: "ACCEPTED" } : trade} />
      </div>

      <div className="relative mt-6 grid gap-4 sm:grid-cols-2 sm:gap-8">
        <CardStrip title="Vous donnez" cards={trade.give} side="left" />
        <CardStrip title="Vous recevez" cards={trade.receive} side="right" />
        <Versus burst={swapping} />
      </div>

      {trade.status === "PENDING" && !swapping && (
        <div className="mt-5 flex justify-end gap-3">
          {trade.role === "recipient" ? (
            <>
              <button
                type="button"
                disabled={busy}
                className={buttonClass}
                onClick={() => onAct("decline")}
              >
                Refuser
              </button>
              <button
                type="button"
                disabled={busy}
                className={primaryButtonClass}
                onClick={() => onAct("accept")}
              >
                Accepter
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              className={dangerButtonClass}
              onClick={() => onAct("cancel")}
            >
              Annuler la proposition
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
  const router = useRouter();
  const [box, setBox] = useState<TradeBox>("incoming");
  const [trades, setTrades] = useState<TradeDto[] | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [composing, setComposing] = useState(!!initialRecipient);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrades(null);
    void load(box);
  }, [box, load]);

  useLiveEvents(["trade"], () => void load(box));

  async function act(trade: TradeDto, action: "accept" | "decline" | "cancel") {
    setBusyId(trade.id);
    setError(null);
    const result = await apiCall(apiUrl, `/trades/${trade.id}/${action}`, "POST");
    if (!result.ok) setError((result.code && ERRORS[result.code]) || result.message);
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
          <h1 className="font-display text-5xl font-medium">Échanges</h1>
          <p className="prose-serif mt-2 text-pale-mist">
            Proposez des cartes à un autre joueur, en échange des siennes.
          </p>
        </div>
        <button type="button" className={primaryButtonClass} onClick={() => setComposing(true)}>
          <Plus className="size-4" /> Proposer un échange
        </button>
      </div>

      <div role="tablist" className="mt-8 flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.box}
            role="tab"
            aria-selected={box === t.box}
            onClick={() => setBox(t.box)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              box === t.box
                ? "border-accent text-foreground"
                : "border-transparent text-fog hover:text-foreground"
            }`}
          >
            {t.label}
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
          <p className="py-10 text-center text-sm text-fog">Chargement…</p>
        ) : trades.length === 0 ? (
          <p className="py-10 text-center text-sm text-fog">
            {box === "incoming"
              ? "Aucune proposition reçue."
              : box === "outgoing"
                ? "Aucune proposition envoyée en attente."
                : "Aucun échange terminé."}
          </p>
        ) : (
          <ul key={box} className="flex flex-col gap-5">
            {trades.map((t, i) => (
              <TradeRow
                key={t.id}
                trade={t}
                index={i}
                busy={busyId === t.id}
                swapping={swappingId === t.id}
                onAct={(a) => act(t, a)}
              />
            ))}
          </ul>
        )}
      </div>

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
