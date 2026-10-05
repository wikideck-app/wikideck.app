"use client";

import { Lock, Search, X } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import type { CreateTradeBody, PlayerSummary } from "@wikideck/shared";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { apiCall, apiFetch } from "@/lib/tags-api";
import { CardSelector, type Selection } from "./card-selector";

const ERRORS: Record<string, string> = {
  self_trade: "Vous ne pouvez pas échanger avec vous-même.",
  player_not_found: "Ce joueur n'existe pas.",
  recipient_private: "Ce joueur a un profil privé : vous ne pouvez pas lui demander de cartes.",
  not_available_mine: "Vous ne possédez plus ces cartes en quantité suffisante.",
  not_available_theirs: "Ce joueur ne possède plus ces cartes en quantité suffisante.",
  too_many_pending: "Trop de propositions en attente : attendez une réponse ou annulez-en.",
  too_many_pending_player: "Vous avez déjà plusieurs propositions en attente avec ce joueur.",
  invalid: "Proposition invalide.",
};

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

export function ComposeDialog({
  apiUrl,
  initialRecipient,
  onCreated,
  onClose,
}: {
  apiUrl: string;
  initialRecipient?: PlayerSummary;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [recipient, setRecipient] = useState<PlayerSummary | null>(initialRecipient ?? null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [offer, setOffer] = useState<Selection>(new Map());
  const [request, setRequest] = useState<Selection>(new Map());
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
    const body: CreateTradeBody = {
      recipientId: recipient.id,
      offer: lines(offer),
      request: lines(request),
    };
    const result = await apiCall(apiUrl, "/trades", "POST", body);
    setSending(false);
    if (!result.ok) {
      setError((result.code && ERRORS[result.code]) || result.message);
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
          <h2 className="text-xl font-bold">Proposer un échange</h2>
          <p className="mt-1 text-sm text-pale-mist">
            Les cartes ne bougent que si l&apos;autre joueur accepte. Sans réponse, la proposition
            expire au bout de 7 jours.
          </p>
        </div>
        <button
          type="button"
          aria-label="Fermer"
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          className="opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
      </div>

      <section className="mt-5">
        <h3 className="text-sm font-bold">Joueur</h3>
        {recipient ? (
          <div className="mt-2 flex items-center gap-3">
            <Avatar player={recipient} />
            <span className="font-bold">{recipient.username}</span>
            {!recipient.isPublic && (
              <span className="inline-flex items-center gap-1 text-xs text-fog">
                <Lock className="size-3" /> profil privé
              </span>
            )}
            {!initialRecipient && (
              <button
                type="button"
                className="text-sm text-pale-mist underline"
                onClick={() => {
                  setRecipient(null);
                  setRequest(new Map());
                }}
              >
                Changer
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
                placeholder="Pseudonyme du joueur…"
                aria-label="Pseudonyme du joueur"
                className="w-full rounded-[20px] border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
              />
            </div>
            {[...search.trim()].length >= 2 && (
              <ul className="mt-2 divide-y divide-line rounded-[20px] border border-line">
                {results.length === 0 && <li className="p-3 text-sm text-fog">Aucun joueur.</li>}
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
              Je donne <span className="font-normal text-fog">({offer.size} sélectionnée(s))</span>
            </h3>
            <div className="mt-3">
              <CardSelector
                apiUrl={apiUrl}
                endpoint="/collection"
                selection={offer}
                onChange={setOffer}
              />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-sm font-bold">
              Je demande{" "}
              <span className="font-normal text-fog">({request.size} sélectionnée(s))</span>
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
                {recipient.username} a un profil privé : vous ne pouvez que lui offrir des cartes.
              </p>
            )}
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
          Annuler
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!recipient || empty || sending}
          onClick={send}
        >
          {sending ? "Envoi…" : "Envoyer la proposition"}
        </button>
      </div>
    </dialog>
  );
}
