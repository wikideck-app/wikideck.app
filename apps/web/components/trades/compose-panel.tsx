"use client";

import { ArrowUpRight, ArrowLeftRight, Check, Lock, Search, Send, X } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  TRADE_EXPIRY_DAYS,
  TRADE_MESSAGE_MAX,
  type CreateTradeBody,
  type PlayerSummary,
} from "@wikideck/shared";
import { OwnedPill } from "@/components/owned-badge";
import { primaryButtonClass } from "@/components/settings/controls";
import { apiCall, apiFetch } from "@/lib/tags-api";
import { CardSelector, type Selection } from "./card-selector";

function Avatar({ player, size = "size-8" }: { player: PlayerSummary; size?: string }) {
  return player.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={player.avatarUrl} alt="" className={`${size} rounded-full`} />
  ) : (
    <span className={`${size} flex items-center justify-center rounded-full bg-accent/10 text-xs font-bold`}>
      {player.username.slice(0, 1).toUpperCase()}
    </span>
  );
}

// carte choisie : miniature, titre, quantité, bouton pour la retirer
function Picked({
  selection,
  onChange,
  empty,
  hint,
  ownedLabel,
}: {
  selection: Selection;
  onChange: (s: Selection) => void;
  empty: string;
  hint: string;
  ownedLabel: (card: Selection extends Map<string, infer V> ? V extends { card: infer C } ? C : never : never) => string | null;
}) {
  const t = useTranslations("trades.compose");
  if (selection.size === 0)
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-line px-4 py-6 text-center">
        <ArrowLeftRight className="size-6 text-fog" aria-hidden />
        <p className="text-sm font-semibold">{empty}</p>
        <p className="text-xs text-fog">{hint}</p>
      </div>
    );
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {[...selection.values()].map(({ card, quantity }) => (
        <li key={card.id} className="flex items-center gap-3 rounded-xl border border-line bg-foreground/5 p-2">
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.imageUrl} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="size-10 shrink-0 rounded-lg bg-foreground/10" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{card.title}</span>
            {card.description && <span className="block truncate text-xs text-fog">{card.description}</span>}
          </span>
          {(() => {
            const label = ownedLabel(card);
            return label ? <OwnedPill label={label} className="shrink-0" /> : null;
          })()}
          {quantity > 1 && <span className="text-sm font-bold tabular-nums">{quantity}×</span>}
          <button
            type="button"
            aria-label={t("removeCard", { title: card.title })}
            onClick={() => {
              const next = new Map(selection);
              next.delete(card.id);
              onChange(next);
            }}
            className="rounded-full p-1 text-fog hover:bg-danger/15 hover:text-danger"
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Column({
  tone,
  title,
  text,
  children,
}: {
  tone: "blue" | "accent";
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  const style =
    tone === "blue"
      ? "border-tag-blue/40 bg-linear-to-b from-tag-blue/10 to-transparent text-tag-blue"
      : "border-accent/40 bg-linear-to-b from-accent/10 to-transparent text-accent";
  return (
    <section className={`min-w-0 rounded-2xl border p-5 ${style}`}>
      <div className="flex items-center gap-3">
        <ArrowUpRight className={`size-7 shrink-0 ${tone === "accent" ? "rotate-180" : ""}`} aria-hidden />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold leading-none">{title}</h2>
          <p className="mt-1.5 text-xs text-pale-mist">{text}</p>
        </div>
      </div>
      <div className="mt-4 text-foreground">{children}</div>
    </section>
  );
}

export function ComposePanel({
  apiUrl,
  initialRecipient,
  onSent,
}: {
  apiUrl: string;
  initialRecipient?: PlayerSummary;
  onSent: () => void;
}) {
  const t = useTranslations("trades");
  const tc = useTranslations("common");
  const [recipient, setRecipient] = useState<PlayerSummary | null>(initialRecipient ?? null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [offer, setOffer] = useState<Selection>(new Map());
  const [request, setRequest] = useState<Selection>(new Map());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    if ([...search.trim()].length < 2) return;
    const timer = setTimeout(async () => {
      const r = await apiFetch<{ players: PlayerSummary[] }>(apiUrl, `/players?q=${encodeURIComponent(search.trim())}`);
      if (id === requestId.current && r.ok) setResults(r.data.players);
    }, 250);
    return () => clearTimeout(timer);
  }, [apiUrl, search]);

  const empty = offer.size === 0 && request.size === 0;
  const canSeeCards = !!recipient && (recipient.isPublic || recipient.friend);
  // bandeaux « déjà possédée » : ce que l'autre joueur a déjà (cartes que je donne), ce que j'ai déjà (cartes que je demande)
  const theirsLabel = (card: { otherOwned?: number }) =>
    recipient && card.otherOwned ? t("owned.theirs", { name: recipient.username, count: card.otherOwned }) : null;
  const mineLabel = (card: { viewerOwned?: number }) =>
    card.viewerOwned ? t("owned.mine", { count: card.viewerOwned }) : null;

  async function send() {
    if (!recipient || empty || sending) return;
    setSending(true);
    setError(null);
    setSentTo(null);
    const lines = (s: Selection) => [...s.values()].map((x) => ({ cardId: x.card.id, quantity: x.quantity }));
    const body: CreateTradeBody = {
      recipientId: recipient.id,
      offer: lines(offer),
      request: lines(request),
      ...(message.trim() && { message: message.trim() }),
    };
    const result = await apiCall(apiUrl, "/trades", "POST", body);
    setSending(false);
    if (!result.ok) {
      setError(result.code && t.has(`errors.${result.code}` as never) ? t(`errors.${result.code}` as never) : result.message);
      return;
    }
    setSentTo(recipient.username);
    setOffer(new Map());
    setRequest(new Map());
    setMessage("");
    onSent();
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-bold">{t("panel.with")}</h2>
        {recipient ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Avatar player={recipient} size="size-9" />
            <span className="text-lg font-bold">{recipient.username}</span>
            {!recipient.isPublic && (
              <span className="inline-flex items-center gap-1 text-xs text-fog">
                <Lock className="size-3" /> {recipient.friend ? t("compose.privateFriend") : t("compose.private")}
              </span>
            )}
            <button
              type="button"
              className="text-sm text-pale-mist underline"
              onClick={() => {
                setRecipient(null);
                setRequest(new Map());
                setSentTo(null);
              }}
            >
              {t("compose.change")}
            </button>
          </div>
        ) : (
          <div className="mt-2 max-w-md">
            <p className="mb-2 text-xs text-fog">{t("panel.withHelp")}</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("compose.searchPlaceholder")}
                aria-label={t("compose.searchLabel")}
                className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
              />
            </div>
            {[...search.trim()].length >= 2 && (
              <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                {results.length === 0 && <li className="p-3 text-sm text-fog">{t("compose.noPlayer")}</li>}
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipient(p);
                        setSearch("");
                        setResults([]);
                      }}
                      className="flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-accent/5"
                    >
                      <Avatar player={p} size="size-6" />
                      <span className="font-bold">{p.username}</span>
                      {!p.isPublic && <Lock className="size-3 text-fog" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_22rem]">
        <Column tone="blue" title={t("panel.give.title")} text={t("panel.give.text", { count: offer.size })}>
          <CardSelector
            apiUrl={apiUrl}
            endpoint="/collection"
            selection={offer}
            onChange={setOffer}
            tone="blue"
            listClassName="max-h-[60vh]"
            extraParams={recipient && canSeeCards ? { with: recipient.id } : undefined}
            ownedLabel={theirsLabel}
          />
        </Column>

        <Column tone="accent" title={t("panel.request.title")} text={t("panel.request.text", { count: request.size })}>
          {!recipient ? (
            <p className="flex items-center gap-2 py-10 text-center text-sm text-pale-mist">{t("panel.pickPlayer")}</p>
          ) : canSeeCards ? (
            <CardSelector
              key={recipient.id}
              apiUrl={apiUrl}
              endpoint={`/players/${recipient.id}/cards`}
              selection={request}
              onChange={setRequest}
              listClassName="max-h-[60vh]"
              ownedLabel={mineLabel}
            />
          ) : (
            <p className="flex items-center gap-2 py-6 text-sm text-pale-mist">
              <Lock className="size-4 shrink-0" />
              {t("compose.privateNotice", { name: recipient.username })}
            </p>
          )}
        </Column>

        <section className="min-w-0 rounded-2xl border border-tag-mauve/40 bg-linear-to-b from-tag-mauve/10 to-transparent p-5 lg:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-3 text-tag-mauve">
            <ArrowLeftRight className="size-7 shrink-0" aria-hidden />
            <div>
              <h2 className="font-display text-2xl font-semibold leading-none">{t("panel.summary.title")}</h2>
              <p className="mt-1.5 text-xs text-pale-mist">{t("panel.summary.text")}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)]">
            <div className="min-w-0">
              <h3 className="mb-2 flex items-baseline justify-between text-sm font-bold text-tag-blue">
                {t("panel.summary.youGive")}
                <span className="text-xs font-normal text-fog">{t("panel.summary.count", { count: offer.size })}</span>
              </h3>
              <Picked selection={offer} onChange={setOffer} empty={t("panel.summary.empty")} hint={t("panel.summary.emptyGive")} ownedLabel={theirsLabel} />
            </div>
            <div className="min-w-0">
              <h3 className="mb-2 flex items-baseline justify-between text-sm font-bold text-accent">
                {t("panel.summary.youRequest")}
                <span className="text-xs font-normal text-fog">{t("panel.summary.count", { count: request.size })}</span>
              </h3>
              <Picked selection={request} onChange={setRequest} empty={t("panel.summary.empty")} hint={t("panel.summary.emptyRequest")} ownedLabel={mineLabel} />
            </div>
          </div>

          <label className="mt-5 block text-sm font-bold">
            {t("panel.summary.message")} <span className="font-normal text-fog">{t("panel.summary.optional")}</span>
            <textarea
              value={message}
              maxLength={TRADE_MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("panel.summary.placeholder")}
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-line bg-transparent p-3 text-sm font-normal outline-none focus:border-accent"
            />
            <span className="block text-right text-[11px] font-normal tabular-nums text-fog">
              {[...message].length}/{TRADE_MESSAGE_MAX}
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
          {sentTo && (
            <p role="status" className="mt-3 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-success">
              <Check className="size-4" /> {t("panel.summary.sent", { name: sentTo })}{" "}
              <Link href="#mes-echanges" className="font-normal underline">
                {t("panel.summary.seeSent")}
              </Link>
            </p>
          )}

          <button type="button" className={`${primaryButtonClass} mt-4 w-full justify-center`} disabled={!recipient || empty || sending} onClick={() => void send()}>
            <Send className="size-4" /> {sending ? tc("sending") : t("compose.send")}
          </button>
          <p className="mt-3 text-center text-[11px] text-fog">
            {!recipient ? t("panel.summary.needPlayer") : t("panel.summary.expiry", { days: TRADE_EXPIRY_DAYS })}
          </p>
        </section>
      </div>
    </div>
  );
}
