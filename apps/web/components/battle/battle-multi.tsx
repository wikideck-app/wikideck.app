"use client";

import { Check, Crown, Gem, Swords, Trophy, Users, X } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BATTLE_DAILY_CAP,
  BATTLE_GAME_BONUS_PER_PLAYER,
  BATTLE_GAME_REWARD,
  BATTLE_MAX_PLAYERS,
  BATTLE_MAX_ROUNDS,
  BATTLE_MIN_PLAYERS,
  BATTLE_REWARD_PLAYERS_CAP,
  BATTLE_ROUND_BONUS_PER_PLAYER,
  BATTLE_ROUND_REWARD,
  type BattleGameMode,
  type BattlePlayer,
  type BattleRoom,
  type BattleRoomSettings,
} from "@wikideck/shared";
import { ArticlePane } from "@/components/battle/article-pane";
import { useBattleRoom } from "@/components/battle/use-battle-room";
import { Wikibits } from "@/components/wikibit";
import { buttonClass, dangerButtonClass, primaryButtonClass } from "@/components/settings/controls";

const panel = "rounded-xl border border-line bg-surface p-5";
const heading = "text-xs font-bold uppercase tracking-[0.2em] text-fog";
const field =
  "rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent";

const MODES: BattleGameMode[] = ["race", "all_finish"];
const TIME_LIMITS = [0, 60, 120, 180, 300, 600];

const fmt = (seconds: number) => {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Avatar({ player, size = "size-8" }: { player: BattlePlayer; size?: string }) {
  return player.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={player.avatarUrl} alt="" className={`${size} shrink-0 rounded-full`} />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold`}
    >
      {player.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Path({ path, won }: { path: string[]; won?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-fog">
      {path.map((t, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-40">›</span>}
          <span className={i === path.length - 1 && won ? "font-bold text-success" : ""}>{t}</span>
        </span>
      ))}
    </div>
  );
}

function Entry({
  busy,
  error,
  initialCode,
  onCreate,
  onJoin,
}: {
  busy: boolean;
  error: string | null;
  initialCode: string;
  onCreate: (s: Partial<BattleRoomSettings>) => void;
  onJoin: (code: string) => void;
}) {
  const t = useTranslations("battle.multi");
  const [code, setCode] = useState(initialCode);
  const joined = useRef(false);
  useEffect(() => {
    if (initialCode.length === 4 && !joined.current) {
      joined.current = true;
      onJoin(initialCode);
    }
  }, [initialCode, onJoin]);

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <section className={panel}>
        <h2 className={heading}>{t("create")}</h2>
        <p className="prose-serif mt-2 text-pale-mist">
          {t("createText")}
        </p>
        <button
          type="button"
          className={`${primaryButtonClass} mt-5`}
          onClick={() => onCreate({})}
          disabled={busy}
        >
          <Swords className="size-4" /> {t("create")}
        </button>
      </section>

      <section className={panel}>
        <h2 className={heading}>{t("join")}</h2>
        <p className="prose-serif mt-2 text-pale-mist">
          {t("joinText")}
        </p>
        <form
          className="mt-5 flex gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onJoin(code);
          }}
        >
          <input
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, "")
                  .slice(0, 4),
              )
            }
            // i18n-ignore : exemple de code, pas un texte
            placeholder="ABCD"
            aria-label={t("codeLabel")}
            className={`${field} w-28 text-center font-mono text-lg uppercase tracking-[0.3em]`}
          />
          <button type="submit" className={buttonClass} disabled={busy || code.length !== 4}>
            {t("joinButton")}
          </button>
        </form>
      </section>
      {error && <p className="text-sm text-danger md:col-span-2">{error}</p>}
    </div>
  );
}

function Lobby({
  room,
  isHost,
  error,
  onSettings,
  onStart,
  onLeave,
}: {
  room: BattleRoom;
  isHost: boolean;
  error: string | null;
  onSettings: (s: Partial<BattleRoomSettings>) => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const t = useTranslations("battle.multi");
  const tb = useTranslations("battle");
  const [copied, setCopied] = useState(false);
  const limitLabel = (s: number) =>
    s === 0 ? t("unlimited") : s < 120 ? t("seconds", { count: s }) : t("minutes", { count: s / 60 });
  const link =
    typeof window === "undefined" ? "" : `${window.location.origin}/battle?room=${room.code}`;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  const enough = room.players.length >= BATTLE_MIN_PLAYERS;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className={panel}>
        <h2 className={heading}>{t("room")}</h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="rounded-xl border-2 border-accent px-5 py-2 font-mono text-4xl font-bold tracking-[0.3em] text-accent">
            {room.code}
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" className={buttonClass} onClick={() => copy(room.code)}>
              {copied ? t("copied") : t("copyCode")}
            </button>
            <button type="button" className={buttonClass} onClick={() => copy(link)}>
              {t("copyLink")}
            </button>
          </div>
        </div>

        <h2 className={`${heading} mt-6 flex items-center gap-2`}>
          <Users className="size-4" /> {t("players", { count: room.players.length, max: room.maxPlayers })}
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {room.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-line px-3 py-2"
            >
              <Avatar player={p} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
              {p.isHost && (
                <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                  <Crown className="size-3.5" /> {t("host")}
                </span>
              )}
            </li>
          ))}
        </ul>
        {room.round > 0 && (
          <p className="mt-3 text-sm text-fog">
            {t("scoresReset")}
          </p>
        )}
      </section>

      <section className={panel}>
        <h2 className={heading}>{t("rules")}</h2>
        {isHost ? (
          <div className="mt-3 flex flex-col gap-4 text-sm">
            <div>
              <div className="mb-1.5 text-fog">{t("mode")}</div>
              <div className="flex flex-wrap gap-2">
                {MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSettings({ gameMode: m })}
                    className={`rounded-full border-2 px-4 py-1.5 font-semibold ${
                      room.gameMode === m
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-line"
                    }`}
                  >
                    {t(`modes.${m}.label`)}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-fog">{t(`modes.${room.gameMode}.hint`)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-fog">{t("rounds")}</span>
                <input
                  type="number"
                  min={1}
                  max={BATTLE_MAX_ROUNDS}
                  value={room.totalRounds}
                  onChange={(e) => onSettings({ totalRounds: Number(e.target.value) })}
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-fog">{t("maxPlayers")}</span>
                <input
                  type="number"
                  min={2}
                  max={BATTLE_MAX_PLAYERS}
                  value={room.maxPlayers}
                  onChange={(e) => onSettings({ maxPlayers: Number(e.target.value) })}
                  className={field}
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1.5">
                <span className="text-fog">{t("timePerRound")}</span>
                <select
                  value={room.timeLimit}
                  onChange={(e) => onSettings({ timeLimit: Number(e.target.value) })}
                  className={field}
                >
                  {TIME_LIMITS.map((limit) => (
                    <option key={limit} value={limit}>
                      {limitLabel(limit)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => onSettings({ searchAllowed: !room.searchAllowed })}
              className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-left"
            >
              <span>{tb("searchInPage")}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  room.searchAllowed ? "bg-accent/15 text-accent" : "bg-foreground/10 text-fog"
                }`}
              >
                {room.searchAllowed ? tb("allowed") : tb("blocked")}
              </span>
            </button>
          </div>
        ) : (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-fog">{t("mode")}</dt>
            <dd className="font-semibold">{t(`modes.${room.gameMode}.label`)}</dd>
            <dt className="text-fog">{t("rounds")}</dt>
            <dd className="font-semibold">{room.totalRounds}</dd>
            <dt className="text-fog">{t("timePerRound")}</dt>
            <dd className="font-semibold">{limitLabel(room.timeLimit)}</dd>
            <dt className="text-fog">{t("ctrlF")}</dt>
            <dd className="font-semibold">
              {room.searchAllowed ? t("searchAllowed") : t("searchBlocked")}
            </dd>
          </dl>
        )}

        <div className="mt-4 rounded-xl border border-line bg-[linear-gradient(135deg,rgb(255_200_80/0.1),rgb(255_138_210/0.06))] px-4 py-3 text-xs leading-relaxed text-pale-mist">
          {t.rich("rewards", {
            round: BATTLE_ROUND_REWARD,
            roundBonus: BATTLE_ROUND_BONUS_PER_PLAYER,
            cap: BATTLE_REWARD_PLAYERS_CAP,
            game: BATTLE_GAME_REWARD,
            gameBonus: BATTLE_GAME_BONUS_PER_PLAYER,
            daily: BATTLE_DAILY_CAP,
            strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
          })}
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isHost ? (
            <button
              type="button"
              className={primaryButtonClass}
              onClick={onStart}
              disabled={!enough}
            >
              {t("launch")}
            </button>
          ) : (
            <p className="text-sm text-fog">{t("waitHost")}</p>
          )}
          <button type="button" className={buttonClass} onClick={onLeave}>
            {t("leaveRoom")}
          </button>
        </div>
        {isHost && !enough && (
          <p className="mt-3 text-xs text-fog">
            {t("needPlayers", { min: BATTLE_MIN_PLAYERS })}
          </p>
        )}
      </section>
    </div>
  );
}

function Countdown({ room, count }: { room: BattleRoom; count: number | null }) {
  const t = useTranslations("battle");
  const tm = useTranslations("battle.multi");
  return createPortal(
    <div className="fixed inset-0 z-90 flex flex-col items-center justify-center gap-10 bg-background px-4 text-center text-foreground">
      <div className="text-xs uppercase tracking-[0.3em] text-fog">
        {tm("round", { round: room.round, total: room.totalRounds })}
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-fog">{t("start")}</div>
          <div className="mt-1 font-display text-3xl font-medium">{room.startArticle}</div>
        </div>
        <span className="text-2xl text-fog">→</span>
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-fog">{t("target")}</div>
          <div className="mt-1 font-display text-3xl font-medium text-accent">
            {room.targetArticle}
          </div>
        </div>
      </div>
      <div
        key={count ?? 0}
        className="godpack-banner font-display text-[clamp(6rem,22vw,11rem)] font-bold leading-none text-accent"
      >
        {count && count > 0 ? count : tm("go")}
      </div>
    </div>,
    document.body,
  );
}

function Playing({ game }: { game: ReturnType<typeof useBattleRoom> }) {
  const t = useTranslations("battle");
  const tm = useTranslations("battle.multi");
  const { room, me } = game;
  const crumbsEnd = useRef<HTMLDivElement>(null);
  const path = me?.path ?? [];
  useEffect(() => {
    crumbsEnd.current?.scrollIntoView({ block: "nearest", inline: "end" });
  }, [path.length]);

  const searchAllowed = room?.searchAllowed ?? false;
  useEffect(() => {
    if (searchAllowed) return;
    const block = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", block, { capture: true });
    return () => window.removeEventListener("keydown", block, { capture: true });
  }, [searchAllowed]);

  const { goBack } = game;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" || (e.target as HTMLElement).closest("input, textarea, select"))
        return;
      e.preventDefault();
      void goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!room || !me) return null;
  const ranked = [...room.players].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );
  const clicks = Math.max(0, path.length - 1);

  return createPortal(
    <div className="fixed inset-0 z-90 flex flex-col bg-background text-foreground">
      <div className="flex flex-col gap-1.5 border-b border-line bg-surface px-3 py-2 sm:px-4">
        <div className="flex items-center justify-center gap-3 text-xs text-fog">
          <span>
            {tm("roundShort", { round: room.round, total: room.totalRounds })}
          </span>
          <span className="rounded-lg bg-accent px-3 py-0.5 text-sm font-bold text-accent-foreground">
            {t("targetIs", { title: room.targetArticle })}
          </span>
          {game.timeLeft !== null && (
            <span
              className={`font-bold tabular-nums ${game.timeLeft <= 10 ? "animate-pulse text-danger" : ""}`}
            >
              {fmt(game.timeLeft)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap text-xs scrollbar-none [&::-webkit-scrollbar]:hidden">
            {path.map((step, i) => (
              <span key={i} className="flex shrink-0 items-center">
                {i > 0 && <span className="px-1 opacity-40">›</span>}
                <span className={i === path.length - 1 ? "font-bold" : "opacity-60"}>{step}</span>
              </span>
            ))}
            <div ref={crumbsEnd} />
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs font-bold tabular-nums text-fog">
            <span>{fmt(game.elapsed)}</span>
            <span>{t("clicks", { count: clicks })}</span>
          </div>
          {game.canPlay && path.length > 1 && (
            <button
              type="button"
              onClick={() => void game.goBack()}
              disabled={game.loading}
              title={t("backTitle")}
              className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:bg-foreground/10 disabled:opacity-40"
            >
              {t("back")}
            </button>
          )}
          {game.canPlay && (
            <button
              type="button"
              onClick={() => void game.send({ action: "surrender" })}
              className="shrink-0 rounded-full border border-danger/50 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
            >
              {t("forfeit")}
            </button>
          )}
          {me.hasWon && (
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-success">
              <Check className="size-4" /> {t("found")}
            </span>
          )}
          {me.hasSurrendered && (
            <span className="shrink-0 text-xs font-bold text-fog">{t("forfeit")}</span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {me.hasWon || me.hasSurrendered ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background px-6 text-center">
            {me.hasWon ? (
              <Trophy className="size-12 text-accent" />
            ) : (
              <X className="size-12 text-fog" />
            )}
            <h2 className="font-display text-3xl font-medium">
              {me.hasWon ? tm("reached") : tm("gaveUp")}
            </h2>
            <p className="prose-serif text-pale-mist">{tm("waitOthers")}</p>
          </div>
        ) : (
          <ArticlePane
            title={game.title}
            html={game.html}
            loading={game.loading}
            loadError={game.loadError}
            onNavigate={(title) => void game.navigate(title)}
            onRetry={game.retry}
          />
        )}

        <aside className="hidden w-52 shrink-0 flex-col gap-3 overflow-y-auto border-l border-line bg-surface px-3 py-4 md:flex">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fog">{tm("playersTitle")}</h4>
          <ul className="flex flex-col gap-2.5">
            {ranked.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Avatar player={p} size="size-7" />
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-xs font-semibold ${p.id === me.id ? "text-accent" : ""}`}
                  >
                    {p.name}
                  </div>
                  <div className="text-[11px] text-fog">
                    {tm("pathClicks", {
                      points: p.score,
                      clicks: Math.max(0, p.path.length - 1),
                    })}
                  </div>
                </div>
                {p.hasWon && <Check className="size-4 shrink-0 text-success" />}
                {p.hasSurrendered && <X className="size-4 shrink-0 text-fog" />}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>,
    document.body,
  );
}

function Results({
  room,
  meId,
  isHost,
  error,
  onNext,
  onReset,
  onLeave,
}: {
  room: BattleRoom;
  meId: string;
  isHost: boolean;
  error: string | null;
  onNext: () => void;
  onReset: () => void;
  onLeave: () => void;
}) {
  const t = useTranslations("battle");
  const tm = useTranslations("battle.multi");
  const ranked = [...room.players].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );
  const winner = room.players.find((p) => p.id === room.roundWinner);
  const rewards = room.rewards ?? {};
  const last = room.round >= room.totalRounds;
  const champion = ranked[0];

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <div className={`${panel} text-center`}>
        {last ? (
          <>
            <Trophy className="mx-auto size-10 text-accent" />
            <h2 className="mt-2 font-display text-4xl font-medium">
              {champion && ranked[1]?.score !== champion.score
                ? tm("wonGame", { name: champion.name })
                : tm("gameOver")}
            </h2>
          </>
        ) : (
          <>
            <Swords className="mx-auto size-10 text-accent" />
            <h2 className="mt-2 font-display text-4xl font-medium">
              {winner ? tm("wonRound", { name: winner.name }) : tm("roundOver")}
            </h2>
          </>
        )}
        <p className="prose-serif mt-1 text-pale-mist">
          {room.startArticle} <span className="opacity-50">→</span>{" "}
          <strong className="text-foreground">{room.targetArticle}</strong>
        </p>
        <p className="mt-1 text-xs text-fog">
          {tm("round", { round: room.round, total: room.totalRounds })}
        </p>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {ranked.map((p, i) => (
          <li
            key={p.id}
            className={`rounded-xl border bg-surface p-3.5 ${p.id === meId ? "border-accent" : "border-line"}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-sm font-bold text-fog">#{i + 1}</span>
              <Avatar player={p} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
              {p.hasWon && (
                <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                  <Check className="size-3.5" /> {tm("foundShort")}
                </span>
              )}
              {p.hasSurrendered && (
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-bold text-fog">
                  {t("forfeit")}
                </span>
              )}
              <span className="flex items-center gap-1 text-sm font-bold text-accent">
                <Gem className="size-4" /> {tm("pts", { count: p.score })}
                {p.roundPoints > 0 && (
                  <span className="text-xs font-semibold text-fog">(+{p.roundPoints})</span>
                )}
              </span>
            </div>
            {rewards[p.id] !== undefined && (
              <div className="mt-2 pl-9">
                {rewards[p.id] < 0 ? (
                  <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold text-fog">
                    {tm("noReward")}
                  </span>
                ) : rewards[p.id] > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-accent">
                    +<Wikibits amount={rewards[p.id]} />
                    {p.id === room.roundWinner && room.round >= room.totalRounds
                      ? tm("rewardRoundAndGame")
                      : p.id === room.roundWinner
                        ? tm("rewardRound")
                        : tm("rewardGame")}
                  </span>
                ) : (
                  <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold text-fog">
                    {tm("dailyCap")}
                  </span>
                )}
              </div>
            )}
            {p.path.length > 0 && (
              <div className="mt-2 pl-9">
                <Path path={p.path} won={p.hasWon} />
                <div className="mt-1 text-[11px] text-fog">
                  {t("clicks", { count: Math.max(0, p.path.length - 1) })}
                  {p.hasWon && p.wonAt && room.roundStart
                    ? ` · ${fmt((p.wonAt - room.roundStart) / 1000)}`
                    : ""}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {isHost ? (
          <>
            {!last ? (
              <button type="button" className={primaryButtonClass} onClick={onNext}>
                {tm("next")}
              </button>
            ) : (
              <button type="button" className={primaryButtonClass} onClick={onReset}>
                {t("solo.newGame")}
              </button>
            )}
            {!last && (
              <button type="button" className={buttonClass} onClick={onReset}>
                {tm("stop")}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-fog">{tm("waitHost")}</p>
        )}
        <button type="button" className={dangerButtonClass} onClick={onLeave}>
          {tm("leave")}
        </button>
      </div>
    </div>
  );
}

export function BattleMulti({
  apiUrl,
  meId,
  initialCode,
}: {
  apiUrl: string;
  meId: string;
  initialCode: string;
}) {
  const game = useBattleRoom({ apiUrl, meId });
  const router = useRouter();
  const { room } = game;
  const myReward = room?.rewards?.[meId] ?? 0;
  const rewardRound = room?.round ?? 0;
  const { create, join, send, leave } = game;

  useEffect(() => {
    if (myReward > 0) router.refresh();
  }, [myReward, rewardRound, router]);

  if (!room)
    return (
      <Entry
        busy={game.busy}
        error={game.error}
        initialCode={initialCode}
        onCreate={create}
        onJoin={join}
      />
    );

  if (room.phase === "results")
    return (
      <Results
        room={room}
        meId={meId}
        isHost={game.isHost}
        error={game.error}
        onNext={() => void send({ action: "start" })}
        onReset={() => void send({ action: "reset" })}
        onLeave={() => void leave()}
      />
    );

  return (
    <>
      <Lobby
        room={room}
        isHost={game.isHost}
        error={game.error}
        onSettings={(settings) => void send({ action: "settings", settings })}
        onStart={() => void send({ action: "start" })}
        onLeave={() => void leave()}
      />
      {room.phase === "countdown" && <Countdown room={room} count={game.countdown} />}
      {room.phase === "playing" && <Playing game={game} />}
    </>
  );
}
