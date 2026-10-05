"use client";

import { ArrowLeft, LineChart, Minus, Plus } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BID_EXTEND_S,
  BID_EXTEND_WINDOW_S,
  MARKET_FEE_PERCENT,
  RARITIES,
  sellerProceeds,
  type AuctionDetail,
} from "@wikideck/shared";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { WikibitIcon, Wikibits } from "@/components/wikibit";
import { pollDelay, useLiveEvents, usePushConnected } from "@/lib/push";
import { apiCall, apiFetch } from "@/lib/tags-api";
import { Countdown } from "./countdown";
import { StatsDialog } from "./stats-dialog";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" });
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
  const router = useRouter();
  const [a, setA] = useState(initial);
  const [amount, setAmount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState(false);
  const active = a.status === "ACTIVE";
  const rarity = RARITIES.find((r) => r.value === a.card.rarity)!;

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
        <ArrowLeft className="size-4" /> Retour au marché
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
            Voir l&apos;article sur Wikipédia
          </a>
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-medium">{a.card.title}</h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-fog">
                <span className="rounded-full border border-line px-2 py-px text-[11px] font-bold text-pale-mist">
                  {rarity.label}
                </span>
                Mis en vente par <Avatar name={a.seller.username} url={a.seller.avatarUrl} />
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
              aria-label="Vue du marché"
              title="Vue du marché"
              onClick={() => setStats(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line text-pale-mist transition-colors hover:border-accent hover:text-foreground bg-surface"
            >
              <LineChart className="size-5" />
            </button>
          </div>

          {!active && (
            <div className={`${panel} mt-6 border-accent/30 bg-accent/[0.04]`}>
              {a.status === "SOLD" && a.currentBid !== null && (
                <>
                  <p className="font-bold">
                    {a.viewer.isLeader
                      ? "Vous avez remporté cette carte !"
                      : `Vendue à ${a.leader?.username ?? "un joueur"}`}
                  </p>
                  <p className="mt-1 text-sm text-pale-mist">
                    Prix final : <Wikibits amount={a.currentBid} className="font-bold" />
                    {a.viewer.isSeller && (
                      <>
                        {" "}
                        · vous avez reçu{" "}
                        <Wikibits
                          amount={sellerProceeds(a.currentBid)}
                          className="font-bold"
                        />{" "}
                        (frais de {MARKET_FEE_PERCENT} % déduits)
                      </>
                    )}
                    {a.viewer.isLeader && " · la carte est dans votre collection."}
                  </p>
                </>
              )}
              {a.status === "UNSOLD" && (
                <p className="font-bold">
                  Invendue
                  <span className="ml-2 text-sm font-normal text-pale-mist">
                    Aucune mise : la carte est revenue chez son vendeur.
                  </span>
                </p>
              )}
              {a.status === "CANCELLED" && (
                <p className="font-bold">Vente annulée par le vendeur.</p>
              )}
            </div>
          )}

          <div className={`${panel} mt-6`}>
            <div className="flex items-center justify-between gap-4">
              <span className={label}>
                {a.currentBid === null ? "Mise de départ" : active ? "Mise actuelle" : "Prix final"}
              </span>
              <Wikibits
                amount={a.currentBid ?? a.startPrice}
                className="text-2xl font-bold"
                iconClass="size-6"
              />
            </div>
            {a.leader && (
              <p className="mt-2 flex items-center justify-end gap-2 text-xs text-fog">
                {active ? "En tête :" : "Acheteur :"}
                <Avatar name={a.leader.username} url={a.leader.avatarUrl} />
                <span className="font-bold text-pale-mist">
                  {a.viewer.isLeader ? "vous" : a.leader.username}
                </span>
              </p>
            )}
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4 text-sm">
              <span className="text-pale-mist">Temps restant</span>
              <Countdown endsAt={a.endsAt} className="font-bold" />
            </div>
          </div>

          {active && !a.viewer.isSeller && (
            <div className={`${panel} mt-4`}>
              <div className="flex items-baseline justify-between text-xs text-fog">
                <span>
                  Votre solde :{" "}
                  <Wikibits amount={a.wikibits} className="font-bold text-foreground" />
                </span>
                <span>
                  Mise minimum : <span className="font-bold text-foreground">{a.minBid}</span>
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
                    aria-label="Moins"
                    onClick={() => step(-Math.max(1, Math.round(a.minBid * 0.05)))}
                    className="px-3 py-2.5 text-pale-mist hover:text-foreground"
                  >
                    <Minus className="size-4" />
                  </button>
                  <WikibitIcon className="size-4 shrink-0 text-fog" />
                  <input
                    type="number"
                    inputMode="numeric"
                    aria-label="Montant de la mise"
                    min={a.minBid}
                    value={value}
                    onChange={(e) => setAmount(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-center font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    aria-label="Plus"
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
                  {busy ? "…" : a.viewer.isLeader ? "Relancer" : "Miser"}
                </button>
              </form>
              {error && (
                <p role="alert" className="mt-3 text-xs text-danger">
                  {error}
                </p>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-fog">
                La mise est débitée immédiatement. Si vous êtes surenchéri, elle vous est
                intégralement remboursée. Une mise dans les {BID_EXTEND_WINDOW_S} dernières secondes
                prolonge la fin de l&apos;enchère de {BID_EXTEND_S} secondes.
              </p>
            </div>
          )}

          {active && a.viewer.isSeller && (
            <div className={`${panel} mt-4`}>
              <p className="text-sm text-pale-mist">
                C&apos;est votre vente. Une fois terminée, vous recevrez le prix moins{" "}
                {MARKET_FEE_PERCENT} % de frais ; sans mise, la carte vous revient.
              </p>
              {a.bidCount === 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={cancel}
                  className={`${dangerButtonClass} mt-4`}
                >
                  Annuler la vente
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
            Historique des mises ({a.bidCount})
          </h2>
          {a.bids.length === 0 ? (
            <p className="mt-3 text-sm text-fog">Aucune mise placée pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
              {a.bids.map((b, i) => (
                <li
                  key={b.id}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                    i === 0 && active ? "bg-accent/[0.04]" : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={b.bidder.username} url={b.bidder.avatarUrl} />
                    <span className="truncate font-bold">{b.bidder.username}</span>
                    <span className="hidden text-xs text-fog sm:inline">
                      {dateFmt.format(new Date(b.createdAt))}
                    </span>
                  </span>
                  <Wikibits amount={b.amount} className="font-bold" />
                </li>
              ))}
            </ul>
          )}
          {!active && (
            <Link href="/market" className={`${buttonClass} mt-8`}>
              Retour au marché
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
