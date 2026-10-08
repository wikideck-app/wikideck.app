"use client";

import { ArrowLeft, MessageCirclePlus, Send, X } from "@/components/icons";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MESSAGE_MAX,
  type ConversationDto,
  type ConversationsResponse,
  type FriendsResponse,
  type MessageDto,
  type PlayerSummary,
  type ThreadResponse,
} from "@wikideck/shared";
import { pollDelay, useLiveEvents, usePushConnected } from "@/lib/push";
import { apiCall, apiFetch } from "@/lib/tags-api";

const THREAD_POLL_MS = 4000;
const LIST_POLL_MS = 10000;

function Avatar({ player, size = "size-10" }: { player: PlayerSummary; size?: string }) {
  return player.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={player.avatarUrl} alt="" className={`${size} shrink-0 rounded-full`} />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold`}
    >
      {player.username.slice(0, 1).toUpperCase()}
    </span>
  );
}

function NewConversation({
  apiUrl,
  onPick,
  onClose,
}: {
  apiUrl: string;
  onPick: (player: PlayerSummary) => void;
  onClose: () => void;
}) {
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const [friends, setFriends] = useState<PlayerSummary[] | null>(null);
  useEffect(() => {
    void apiFetch<FriendsResponse>(apiUrl, "/friends").then((r) =>
      setFriends(r.ok ? r.data.friends.map((f) => f.player) : []),
    );
  }, [apiUrl]);

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold">{t("new")}</h2>
        <button
          type="button"
          aria-label={tc("close")}
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          className="opacity-60 hover:opacity-100"
        >
          <X className="size-5" />
        </button>
      </div>
      <p className="mt-1 text-sm text-pale-mist">{t("friendsOnly")}</p>
      {friends === null ? (
        <p className="py-8 text-center text-sm text-fog">{tc("loading")}</p>
      ) : friends.length === 0 ? (
        <p className="py-8 text-center text-sm text-fog">
          {t("noFriends")}
        </p>
      ) : (
        <ul className="mt-4 max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-surface">
          {friends.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={(e) => {
                  onPick(p);
                  e.currentTarget.closest("dialog")?.close();
                }}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/5"
              >
                <Avatar player={p} size="size-8" />
                <span className="truncate text-sm font-bold">{p.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  );
}

function Thread({
  apiUrl,
  player,
  onBack,
  onActivity,
}: {
  apiUrl: string;
  player: PlayerSummary;
  onBack: () => void;
  onActivity: () => void;
}) {
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [messages, setMessages] = useState<MessageDto[] | null>(null);
  const [canSend, setCanSend] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastSeen = useRef<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch<ThreadResponse>(apiUrl, `/messages/${player.id}`);
    if (!r.ok) return setError(r.message);
    setCanSend(r.data.canSend);
    const last = r.data.messages.at(-1);
    setMessages((prev) =>
      prev &&
      prev.length === r.data.messages.length &&
      prev.at(-1)?.id === last?.id &&
      prev.every((m, i) => m.read === r.data.messages[i].read)
        ? prev
        : r.data.messages,
    );
    if (last && last.id !== lastSeen.current) {
      if (lastSeen.current !== null && !last.mine) onActivity();
      lastSeen.current = last.id;
    }
  }, [apiUrl, player.id, onActivity]);

  const connected = usePushConnected();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().then(onActivity);
  }, [load, onActivity]);

  useLiveEvents(["message"], () => void load());
  useEffect(() => {
    const id = setInterval(
      () => {
        if (document.visibilityState === "visible") void load();
      },
      pollDelay(connected, THREAD_POLL_MS),
    );
    return () => clearInterval(id);
  }, [load, connected]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const r = await apiCall<MessageDto>(apiUrl, `/messages/${player.id}`, "POST", { body });
    setSending(false);
    if (!r.ok) return setError(r.message);
    setDraft("");
    stick.current = true;
    setMessages((prev) => [...(prev ?? []), r.data]);
    lastSeen.current = r.data.id;
    onActivity();
  }

  let day = "";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          aria-label={t("back")}
          onClick={onBack}
          className="text-pale-mist hover:text-foreground md:hidden"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Avatar player={player} size="size-9" />
        <Link href={`/profile/${player.id}`} className="truncate font-bold hover:underline">
          {player.username}
        </Link>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4"
      >
        {messages === null ? (
          <p className="py-10 text-center text-sm text-fog">{tc("loading")}</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-fog">
            {t("empty", { name: player.username })}
          </p>
        ) : (
          messages.map((m, i) => {
            const d = format.dateTime(new Date(m.createdAt), "weekday");
            const header = d !== day ? d : null;
            day = d;
            const next = messages[i + 1];
            const lastOfMine = m.mine && !(next && next.mine);
            return (
              <div key={m.id}>
                {header && (
                  <p className="my-4 text-center text-[11px] uppercase tracking-[0.15em] text-fog">
                    {header}
                  </p>
                )}
                <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap wrap-break-word rounded-2xl px-3.5 py-2 text-sm ${
                      m.mine ? "rounded-br-md bg-accent/12" : "rounded-bl-md border border-line"
                    }`}
                    title={format.dateTime(new Date(m.createdAt), "time")}
                  >
                    {m.body}
                  </div>
                </div>
                <p
                  className={`mt-0.5 px-1 text-[10px] text-fog ${m.mine ? "text-right" : "text-left"}`}
                >
                  {format.dateTime(new Date(m.createdAt), "time")}
                  {lastOfMine && m.read && t("read")}
                  {!m.mine &&
                    (reported.has(m.id) ? (
                      t("reported")
                    ) : reporting === m.id ? (
                      <>
                        {" · "}
                        <button
                          type="button"
                          className="font-semibold text-danger hover:underline"
                          onClick={async () => {
                            const r = await apiCall(apiUrl, "/messages/report", "POST", {
                              messageId: m.id,
                            });
                            setReporting(null);
                            if (r.ok || (!r.ok && r.code === "already_reported"))
                              setReported((s) => new Set(s).add(m.id));
                            else setError(r.message);
                          }}
                        >
                          {t("confirmReport")}
                        </button>{" "}
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={() => setReporting(null)}
                        >
                          {tc("cancel")}
                        </button>
                      </>
                    ) : (
                      <>
                        {" · "}
                        <button
                          type="button"
                          className="hover:text-danger hover:underline"
                          onClick={() => setReporting(m.id)}
                        >
                          {t("report")}
                        </button>
                      </>
                    ))}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-line p-3">
        {canSend ? (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              value={draft}
              rows={1}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={t("placeholder")}
              aria-label={t("label")}
              className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-line bg-transparent px-3 py-2 text-sm outline-none field-sizing-content focus:border-accent"
            />
            <button
              type="submit"
              aria-label={t("send")}
              disabled={!draft.trim() || sending}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-(--voltage-violet) hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>
        ) : (
          <p className="text-center text-xs text-fog">
            {t("notFriends", { name: player.username })}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function MessagesView({
  initial,
  initialWith,
  apiUrl,
}: {
  initial: ConversationDto[];
  initialWith: string | null;
  apiUrl: string;
}) {
  const t = useTranslations("messages");
  const format = useFormatter();
  const router = useRouter();
  const [conversations, setConversations] = useState(initial);
  const [active, setActive] = useState<PlayerSummary | null>(
    () => initial.find((c) => c.player.id === initialWith)?.player ?? null,
  );
  const [picking, setPicking] = useState(false);

  const reloadList = useCallback(async () => {
    const r = await apiFetch<ConversationsResponse>(apiUrl, "/messages");
    if (r.ok) setConversations(r.data.conversations);
  }, [apiUrl]);

  const refreshMenu = useCallback(() => {
    void reloadList();
    router.refresh();
  }, [reloadList, router]);

  const connected = usePushConnected();
  useLiveEvents(["message"], () => void reloadList());
  useEffect(() => {
    const id = setInterval(
      () => {
        if (document.visibilityState === "visible") void reloadList();
      },
      pollDelay(connected, LIST_POLL_MS),
    );
    return () => clearInterval(id);
  }, [reloadList, connected]);

  useEffect(() => {
    if (!initialWith || active) return;
    void apiFetch<ThreadResponse>(apiUrl, `/messages/${initialWith}`).then((r) => {
      if (r.ok) setActive(r.data.player);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const when = (iso: string) => {
    const d = new Date(iso);
    return d.toDateString() === new Date().toDateString()
      ? format.dateTime(d, "time")
      : format.dateTime(d, "short");
  };

  function open(player: PlayerSummary | null) {
    setActive(player);
    window.history.replaceState(null, "", player ? `/messages?with=${player.id}` : "/messages");
  }

  return (
    <div className="mt-8 flex h-[calc(100dvh-14rem)] min-h-112 overflow-hidden rounded-xl border border-line bg-surface">
      <aside
        className={`${active ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-line md:w-80 md:border-r`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{t("conversations")}</h2>
          <button
            type="button"
            aria-label={t("new")}
            title={t("new")}
            onClick={() => setPicking(true)}
            className="text-pale-mist hover:text-foreground"
          >
            <MessageCirclePlus className="size-5" />
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <li className="p-6 text-center text-sm text-fog">
              {t("emptyList")}
            </li>
          )}
          {conversations.map((c) => (
            <li key={c.player.id}>
              <button
                type="button"
                onClick={() => open(c.player)}
                aria-current={active?.id === c.player.id}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/5 aria-current:bg-accent/[0.07]"
              >
                <Avatar player={c.player} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-bold">{c.player.username}</p>
                    <span className="shrink-0 text-[11px] text-fog">{when(c.last.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-xs ${c.unread ? "font-bold text-foreground" : "text-fog"}`}
                    >
                      {c.last.mine ? t("you", { body: c.last.body }) : c.last.body}
                    </p>
                    {c.unread > 0 && (
                      <span className="min-w-5 shrink-0 rounded-full border border-accent bg-accent px-1.5 text-center text-[10px] font-bold leading-5 text-accent-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={`${active ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {active ? (
          <Thread
            key={active.id}
            apiUrl={apiUrl}
            player={active}
            onBack={() => open(null)}
            onActivity={refreshMenu}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-fog">
            {t("pick")}
          </div>
        )}
      </section>

      {picking && (
        <NewConversation apiUrl={apiUrl} onPick={open} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}
