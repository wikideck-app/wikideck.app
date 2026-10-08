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
import { useFormatter, useTranslations } from "next-intl";
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
  const t = useTranslations("friends");
  return player.isPublic ? (
    <span className="text-[11px] text-fog">{t("public")}</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-fog">
      <Lock className="size-3" /> {t("private")}
    </span>
  );
}

export function FriendsView({ initial, apiUrl }: { initial: FriendsResponse; apiUrl: string }) {
  const t = useTranslations("friends");
  const tc = useTranslations("common");
  const format = useFormatter();
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
    if (!r.ok) setError(r.message ?? tc("errors.generic"));
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
        <h2 className={heading}>{t("add")}</h2>
        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="w-full rounded-lg border border-line bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        {searching && (
          <ul className="mt-3 max-w-md divide-y divide-line rounded-xl border border-line bg-surface">
            {results.length === 0 && (
              <li className="p-3 text-sm text-fog">
                {t("noResult")}
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
                  {p.relation === "friend" && <span className="text-xs text-fog">{t("already")}</span>}
                  {p.relation === "outgoing" && (
                    <span className="text-xs text-fog">{t("sent")}</span>
                  )}
                  {p.relation === "incoming" && incoming && (
                    <button
                      type="button"
                      disabled={busy === incoming.id}
                      onClick={() => accept(incoming.id)}
                      className={primaryButtonClass}
                    >
                      {tc("accept")}
                    </button>
                  )}
                  {p.relation === "none" && (
                    <button
                      type="button"
                      disabled={busy === `add:${p.id}`}
                      onClick={() => add(p)}
                      className={buttonClass}
                    >
                      <UserPlus className="size-4" /> {tc("add")}
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
            ["friends", t("tabs.friends", { count: data.friends.length })],
            ["requests", t("tabs.requests")],
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
              <span className="min-w-5 rounded-full border border-accent bg-accent px-1.5 text-center text-[10px] leading-5 text-accent-foreground">
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
              {t("none")}
            </p>
          ) : (
            <>
              <p className="mb-4 text-xs text-fog">
                {t("count", { count: data.friends.length, max: FRIENDS_MAX })}
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
                        {t("since", { date: format.dateTime(new Date(f.since), "medium") })}
                        {f.cards !== null && ` · ${t("cards", { count: f.cards })}`}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/trades?to=${f.player.id}`} className={buttonClass}>
                          <ArrowLeftRight className="size-4" /> {t("trade")}
                        </Link>
                        <Link href={`/messages?with=${f.player.id}`} className={buttonClass}>
                          <MessageCircle className="size-4" /> {t("message")}
                        </Link>
                        <button
                          type="button"
                          disabled={busy === f.id}
                          aria-label={t("removeLabel", { name: f.player.username })}
                          onClick={async () => {
                            const ok = await confirm({
                              title: t("removeTitle", { name: f.player.username }),
                              confirmLabel: t("remove"),
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
                      <div className="w-20 shrink-0 self-start" title={t("showcase")}>
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
            <h2 className={heading}>{t("received", { count: data.incoming.length })}</h2>
            {data.incoming.length === 0 ? (
              <p className="mt-4 text-sm text-fog">{t("noReceived")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                {data.incoming.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-4">
                    <Avatar player={r.player} size="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.player.username}</p>
                      <p className="text-xs text-fog">{format.dateTime(new Date(r.createdAt), "medium")}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={t("refuse", { name: r.player.username })}
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
                      <Check className="size-4" /> {tc("accept")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className={heading}>{t("sentTitle", { count: data.outgoing.length })}</h2>
            {data.outgoing.length === 0 ? (
              <p className="mt-4 text-sm text-fog">{t("noSent")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                {data.outgoing.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-4">
                    <Avatar player={r.player} size="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.player.username}</p>
                      <p className="text-xs text-fog">{t("waiting")}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => remove(r.id)}
                      className={buttonClass}
                    >
                      {tc("cancel")}
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
