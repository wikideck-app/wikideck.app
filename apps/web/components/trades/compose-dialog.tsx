"use client";

import { Lock, Search, X } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  TRADE_EXPIRY_DAYS,
  type CounterTradeBody,
  type CreateTradeBody,
  type PlayerSummary,
  type TradeCard,
  type TradeDto,
} from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { apiCall, apiFetch } from "@/lib/tags-api";
import { CardSelector, type Selection } from "./card-selector";

function Avatar({ player }: { player: PlayerSummary }) {
  return player.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={player.avatarUrl} alt="" className="size-6 rounded-full" />
  ) : (
    <span className="flex size-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold">
      {player.username.slice(0, 1).toUpperCase()}
    </span>
  );
}

// cartes d'une proposition existante, reprises comme sélection de départ d'une contre-proposition
const selectionOf = (cards: TradeCard[]): Selection =>
  new Map(
    cards.map((c) => [
      c.id,
      { card: { ...c, favorite: false, tags: [] }, quantity: c.quantity },
    ]),
  );

function Chosen({ selection, onChange }: { selection: Selection; onChange: (s: Selection) => void }) {
  const t = useTranslations("trades.compose");
  if (selection.size === 0) return null;
  return (
    <ul aria-label={t("chosen")} className="mt-3 flex flex-wrap gap-2">
      {[...selection.values()].map(({ card, quantity }) => (
        <li key={card.id}>
          <button
            type="button"
            aria-label={t("removeCard", { title: card.title })}
            onClick={() => {
              const next = new Map(selection);
              next.delete(card.id);
              onChange(next);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-danger"
          >
            {quantity > 1 && <span className="tabular-nums">{quantity}×</span>}
            <span className="max-w-40 truncate">{card.title}</span>
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ComposeDialog({
  apiUrl,
  initialRecipient,
  counterOf,
  onCreated,
  onClose,
}: {
  apiUrl: string;
  initialRecipient?: PlayerSummary;
  /** proposition reçue à laquelle on répond par une contre-proposition */
  counterOf?: TradeDto;
  onCreated: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("trades");
  const tc = useTranslations("common");
  const fixedRecipient = counterOf?.counterparty ?? initialRecipient;
  const [recipient, setRecipient] = useState<PlayerSummary | null>(fixedRecipient ?? null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [offer, setOffer] = useState<Selection>(() => selectionOf(counterOf?.give ?? []));
  const [request, setRequest] = useState<Selection>(() => selectionOf(counterOf?.receive ?? []));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    if ([...search.trim()].length < 2) return;
    const timer = setTimeout(async () => {
      const r = await apiFetch<{ players: PlayerSummary[] }>(
        apiUrl,
        `/players?q=${encodeURIComponent(search.trim())}`,
      );
      if (id === requestId.current && r.ok) setResults(r.data.players);
    }, 250);
    return () => clearTimeout(timer);
  }, [apiUrl, search]);

  const empty = offer.size === 0 && request.size === 0;

  async function send() {
    if (!recipient || empty) return;
    setSending(true);
    setError(null);
    const lines = (s: Selection) =>
      [...s.values()].map((x) => ({ cardId: x.card.id, quantity: x.quantity }));
    const body: CreateTradeBody | CounterTradeBody = counterOf
      ? { offer: lines(offer), request: lines(request) }
      : { recipientId: recipient.id, offer: lines(offer), request: lines(request) };
    const result = await apiCall(
      apiUrl,
      counterOf ? `/trades/${counterOf.id}/counter` : "/trades",
      "POST",
      body,
    );
    setSending(false);
    if (!result.ok) {
      setError(
        result.code && t.has(`errors.${result.code}` as never)
          ? t(`errors.${result.code}` as never)
          : result.message,
      );
      return;
    }
    onCreated();
    document.querySelector<HTMLDialogElement>("dialog[data-compose]")?.close();
  }

  return (
    <dialog
      data-compose
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      className="m-auto max-h-[92vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            {counterOf ? t("compose.counterTitle") : t("compose.title")}
          </h2>
          <p className="mt-1 text-sm text-pale-mist">
            {t(counterOf ? "compose.counterIntro" : "compose.intro", { days: TRADE_EXPIRY_DAYS })}
          </p>
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

      <section className="mt-5">
        <h3 className="text-sm font-bold">{t("compose.player")}</h3>
        {recipient ? (
          <div className="mt-2 flex items-center gap-3">
            <Avatar player={recipient} />
            <span className="font-bold">{recipient.username}</span>
            {!recipient.isPublic && (
              <span className="inline-flex items-center gap-1 text-xs text-fog">
                <Lock className="size-3" /> {t("compose.private")}
              </span>
            )}
            {!fixedRecipient && (
              <button
                type="button"
                className="text-sm text-pale-mist underline"
                onClick={() => {
                  setRecipient(null);
                  setRequest(new Map());
                }}
              >
                {t("compose.change")}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2 max-w-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
              <input
                type="search"
                autoFocus
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
                      onClick={() => setRecipient(p)}
                      className="flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-accent/5"
                    >
                      <Avatar player={p} />
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

      {recipient && (
        <>
          <section className="mt-6">
            <h3 className="text-sm font-bold">
              {t("compose.give")}{" "}
              <span className="font-normal text-fog">{t("compose.selected", { count: offer.size })}</span>
            </h3>
            <div className="mt-3">
              <CardSelector
                apiUrl={apiUrl}
                endpoint="/collection"
                selection={offer}
                onChange={setOffer}
              />
            </div>
            <Chosen selection={offer} onChange={setOffer} />
          </section>

          <section className="mt-6">
            <h3 className="text-sm font-bold">
              {t("compose.request")}{" "}
              <span className="font-normal text-fog">{t("compose.selected", { count: request.size })}</span>
            </h3>
            {recipient.isPublic ? (
              <div className="mt-3">
                <CardSelector
                  key={recipient.id}
                  apiUrl={apiUrl}
                  endpoint={`/players/${recipient.id}/cards`}
                  selection={request}
                  onChange={setRequest}
                />
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-pale-mist">
                <Lock className="size-4 shrink-0" />
                {t("compose.privateNotice", { name: recipient.username })}
              </p>
            )}
            <Chosen selection={request} onChange={setRequest} />
          </section>
        </>
      )}

      {error && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          className={buttonClass}
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
        >
          {tc("cancel")}
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!recipient || empty || sending}
          onClick={send}
        >
          {sending ? tc("sending") : counterOf ? t("compose.counterSend") : t("compose.send")}
        </button>
      </div>
    </dialog>
  );
}
