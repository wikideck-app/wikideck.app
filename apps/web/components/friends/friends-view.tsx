"use client";

import {
  ArrowLeftRight,
  Check,
  Lock,
  MessageCircle,
  Search,
  UserMinus,
  UserPlus,
  X,
} from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FRIENDS_MAX,
  type FriendsResponse,
  type PlayerSearchResult,
  type PlayerSummary,
} from "@wikideck/shared";
import { useConfirm } from "@/components/confirm-dialog";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { WikiCard } from "@/components/wiki-card";
import { useLiveEvents } from "@/lib/push";
import { apiCall, apiFetch } from "@/lib/tags-api";

type Tab = "friends" | "requests";
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const panel = "rounded-xl border border-line p-5 bg-surface";
const heading = "text-xs font-bold uppercase tracking-[0.2em] text-fog";

function Avatar({ player, size = "size-10" }: { player: PlayerSummary; size?: string }) {
  return player.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={player.avatarUrl} alt="" className={`${size} rounded-full`} />
  ) : (
    <span
      className={`${size} flex items-center justify-center rounded-full bg-accent/10 text-sm font-bold`}
    >
      {player.username.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Visibility({ player }: { player: PlayerSummary }) {
  return player.isPublic ? (
    <span className="text-[11px] text-fog">Profil public</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-fog">
      <Lock className="size-3" /> Profil privé
    </span>
  );
}

export function FriendsView({ initial, apiUrl }: { initial: FriendsResponse; apiUrl: string }) {
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>("friends");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const r = await apiFetch<FriendsResponse>(apiUrl, "/friends");
    if (r.ok) setData(r.data);
    router.refresh();
  }, [apiUrl, router]);

  useLiveEvents(["friend"], () => void reload());

  useEffect(() => {
    const id = ++requestId.current;
    if ([...search.trim()].length < 2) return;
    const timer = setTimeout(async () => {
      const r = await apiFetch<{ players: PlayerSearchResult[] }>(
        apiUrl,
        `/players?by=discord&q=${encodeURIComponent(search.trim())}`,
      );
      if (id === requestId.current && r.ok) setResults(r.data.players);
    }, 250);
    return () => clearTimeout(timer);
  }, [apiUrl, search]);

  async function run(key: string, call: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(key);
    setError(null);
    const r = await call();
    if (!r.ok) setError(r.message ?? "Une erreur est survenue.");
    await reload();
    if ([...search.trim()].length >= 2) {
      const s = await apiFetch<{ players: PlayerSearchResult[] }>(
        apiUrl,
        `/players?by=discord&q=${encodeURIComponent(search.trim())}`,
      );
      if (s.ok) setResults(s.data.players);
    }
    setBusy(null);
  }

  const add = (p: PlayerSummary) =>
    run(`add:${p.id}`, () => apiCall(apiUrl, "/friends", "POST", { userId: p.id }));
  const accept = (id: string) => run(id, () => apiCall(apiUrl, `/friends/${id}/accept`, "POST"));
  const remove = (id: string) => run(id, () => apiCall(apiUrl, `/friends/${id}`, "DELETE"));
  const incomingFor = (playerId: string) => data.incoming.find((r) => r.player.id === playerId);

  const searching = [...search.trim()].length >= 2;

  return (
    <div>
      {confirmDialog}
      <section className={`${panel} mt-8`}>
        <h2 className={heading}>Ajouter un ami</h2>
        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom d'utilisateur Discord (@nom)…"
            aria-label="Rechercher un joueur par nom d'utilisateur Discord"
            className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        {searching && (
          <ul className="mt-3 max-w-md divide-y divide-line rounded-xl border border-line bg-surface">
            {results.length === 0 && (
              <li className="p-3 text-sm text-fog">
                Aucun joueur trouvé : saisissez le nom d&apos;utilisateur Discord exact (pas le
                pseudonyme affiché).
              </li>
            )}
            {results.map((p) => {
              const incoming = incomingFor(p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <Avatar player={p} size="size-8" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <strong>{p.username}</strong>
                    {p.discordName && <span className="ml-2 text-fog">@{p.discordName}</span>}
                  </span>
                  {p.relation === "friend" && <span className="text-xs text-fog">Déjà ami</span>}
                  {p.relation === "outgoing" && (
                    <span className="text-xs text-fog">Demande envoyée</span>
                  )}
                  {p.relation === "incoming" && incoming && (
                    <button
                      type="button"
                      disabled={busy === incoming.id}
                      onClick={() => accept(incoming.id)}
                      className={primaryButtonClass}
                    >
                      Accepter
                    </button>
                  )}
                  {p.relation === "none" && (
                    <button
                      type="button"
                      disabled={busy === `add:${p.id}`}
                      onClick={() => add(p)}
                      className={buttonClass}
                    >
                      <UserPlus className="size-4" /> Ajouter
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      <div role="tablist" className="mt-8 flex gap-2 border-b border-line">
        {(
          [
            ["friends", `Amis (${data.friends.length})`],
            ["requests", "Demandes"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              tab === key
                ? "border-accent text-foreground"
                : "border-transparent text-fog hover:text-foreground"
            }`}
          >
            {label}
            {key === "requests" && data.incoming.length > 0 && (
              <span className="min-w-5 rounded-lg bg-accent px-1.5 text-center text-[10px] leading-5 text-accent-foreground">
                {data.incoming.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        <div className="mt-6">
          {data.friends.length === 0 ? (
            <p className="py-12 text-center text-sm text-fog">
              Vous n&apos;avez pas encore d&apos;ami. Cherchez un joueur par pseudonyme ci-dessus.
            </p>
          ) : (
            <>
              <p className="mb-4 text-xs text-fog">
                {data.friends.length} / {FRIENDS_MAX} amis
              </p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.friends.map((f) => (
                  <li key={f.id} className={`${panel} flex gap-4`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <Avatar player={f.player} />
                        <div className="min-w-0">
                          <Link
                            href={`/profile/${f.player.id}`}
                            className="block truncate font-bold hover:underline"
                          >
                            {f.player.username}
                          </Link>
                          <Visibility player={f.player} />
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-fog">
                        Amis depuis le {dateFmt.format(new Date(f.since))}
                        {f.cards !== null && ` · ${f.cards} carte${f.cards > 1 ? "s" : ""}`}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/trades?to=${f.player.id}`} className={buttonClass}>
                          <ArrowLeftRight className="size-4" /> Échanger
                        </Link>
                        <Link href={`/messages?with=${f.player.id}`} className={buttonClass}>
                          <MessageCircle className="size-4" /> Message
                        </Link>
                        <button
                          type="button"
                          disabled={busy === f.id}
                          aria-label={`Retirer ${f.player.username} de mes amis`}
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Retirer ${f.player.username} de vos amis ?`,
                              confirmLabel: "Retirer",
                              danger: true,
                            });
                            if (ok) void remove(f.id);
                          }}
                          className="rounded-full border border-line px-3 text-fog transition-colors hover:border-accent hover:text-foreground"
                        >
                          <UserMinus className="size-4" />
                        </button>
                      </div>
                    </div>
                    {f.showcase && (
                      <div className="w-20 shrink-0 self-start" title="Carte vitrine">
                        <WikiCard card={f.showcase} compact />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className={heading}>Reçues ({data.incoming.length})</h2>
            {data.incoming.length === 0 ? (
              <p className="mt-4 text-sm text-fog">Aucune demande reçue.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                {data.incoming.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-4">
                    <Avatar player={r.player} size="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.player.username}</p>
                      <p className="text-xs text-fog">{dateFmt.format(new Date(r.createdAt))}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Refuser ${r.player.username}`}
                      disabled={busy === r.id}
                      onClick={() => remove(r.id)}
                      className={buttonClass}
                    >
                      <X className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => accept(r.id)}
                      className={primaryButtonClass}
                    >
                      <Check className="size-4" /> Accepter
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className={heading}>Envoyées ({data.outgoing.length})</h2>
            {data.outgoing.length === 0 ? (
              <p className="mt-4 text-sm text-fog">Aucune demande en attente.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                {data.outgoing.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-4">
                    <Avatar player={r.player} size="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.player.username}</p>
                      <p className="text-xs text-fog">En attente de réponse</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => remove(r.id)}
                      className={buttonClass}
                    >
                      Annuler
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
