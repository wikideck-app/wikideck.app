"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BATTLE_COUNTDOWN_MS,
  type BattleRoom,
  type BattleRoomAction,
  type BattleRoomResponse,
  type BattleRoomSettings,
} from "@wikideck/shared";
import { apiCall, apiFetch } from "@/lib/tags-api";
import { fetchArticle, prefetchArticle } from "@/lib/wiki-client";

const HEARTBEAT_MS = 15_000;
const STALE_MS = 12_000;

export function useBattleRoom({ apiUrl, meId }: { apiUrl: string; meId: string }) {
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const roomRef = useRef<BattleRoom | null>(null);
  const loadingRef = useRef(false);
  const lastEvent = useRef(0);
  const sentPlay = useRef(0);
  const sentTimeUp = useRef(0);
  const loadedRound = useRef(0);
  useEffect(() => {
    roomRef.current = room;
  });

  const me = room?.players.find((p) => p.id === meId) ?? null;
  const code = room?.code ?? null;
  const phase = room?.phase;
  const round = room?.round ?? 0;

  const send = useCallback(
    async (body: BattleRoomAction) => {
      const current = roomRef.current;
      if (!current) return null;
      const res = await apiCall<{ room: BattleRoom | null }>(
        apiUrl,
        `/battle/rooms/${current.code}`,
        "POST",
        body,
      );
      if (res.ok) {
        setRoom(res.data.room);
        setError(null);
      } else {
        setError(res.message);
        if (res.status === 404 || res.code === "not_member") setRoom(null);
      }
      return res;
    },
    [apiUrl],
  );

  const create = useCallback(
    async (settings: Partial<BattleRoomSettings>) => {
      setBusy(true);
      setError(null);
      const res = await apiCall<BattleRoomResponse>(apiUrl, "/battle/rooms", "POST", settings);
      setBusy(false);
      if (res.ok) setRoom(res.data.room);
      else setError(res.message);
    },
    [apiUrl],
  );

  const join = useCallback(
    async (rawCode: string) => {
      const target = rawCode.trim().toUpperCase();
      if (target.length !== 4) return setError("Le code d'un salon fait 4 lettres.");
      setBusy(true);
      setError(null);
      const res = await apiCall<BattleRoomResponse>(apiUrl, `/battle/rooms/${target}`, "POST", {
        action: "join",
      } satisfies BattleRoomAction);
      setBusy(false);
      if (res.ok) setRoom(res.data.room);
      else setError(res.code === "not_found" ? "Aucun salon avec ce code." : res.message);
    },
    [apiUrl],
  );

  const leave = useCallback(async () => {
    await send({ action: "leave" });
    setRoom(null);
    setHtml("");
    setTitle("");
  }, [send]);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ room: BattleRoom | null }>(apiUrl, "/battle/rooms/mine").then((res) => {
      if (!cancelled && res.ok && res.data.room) setRoom(res.data.room);
    });
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  useEffect(() => {
    if (!code) return;
    const stream = new EventSource(`${apiUrl}/battle/rooms/${code}/stream`, {
      withCredentials: true,
    });
    stream.onmessage = (e) => {
      lastEvent.current = Date.now();
      try {
        setRoom(JSON.parse(e.data) as BattleRoom);
      } catch {}
    };
    return () => stream.close();
  }, [apiUrl, code]);

  useEffect(() => {
    if (!code) return;
    let beats = 0;
    const id = setInterval(async () => {
      if (document.hidden) return;
      beats += 1000;
      if (Date.now() - lastEvent.current > STALE_MS) {
        const res = await apiFetch<{ room: BattleRoom }>(apiUrl, `/battle/rooms/${code}`);
        if (res.ok) {
          lastEvent.current = Date.now();
          setRoom(res.data.room);
        } else if (res.status === 404) {
          setRoom(null);
          setError("Ce salon n'existe plus.");
        }
      }
      if (beats >= HEARTBEAT_MS) {
        beats = 0;
        void send({ action: "heartbeat" });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [apiUrl, code, send]);

  useEffect(() => {
    if (phase !== "countdown" && phase !== "playing") return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [phase]);

  const load = useCallback(async (target: string): Promise<string | null> => {
    setLoadError(null);
    setLoading(true);
    loadingRef.current = true;
    const article = await fetchArticle(target);
    loadingRef.current = false;
    setLoading(false);
    if (!article) {
      setLoadError(`Impossible de charger « ${target} ».`);
      return null;
    }
    setHtml(article.html);
    setTitle(article.title);
    return article.title;
  }, []);

  useEffect(() => {
    if (phase === "countdown" && roomRef.current) prefetchArticle(roomRef.current.startArticle);
  }, [phase, round]);

  const countdownMs = room?.countdownStart
    ? BATTLE_COUNTDOWN_MS - (now - room.countdownStart)
    : null;
  useEffect(() => {
    if (
      phase === "countdown" &&
      countdownMs !== null &&
      countdownMs <= 0 &&
      sentPlay.current !== round
    ) {
      sentPlay.current = round;
      void send({ action: "play" });
    }
  }, [phase, round, countdownMs, send]);

  useEffect(() => {
    const current = roomRef.current;
    if (phase !== "playing" || !current || loadedRound.current === round) return;
    loadedRound.current = round;
    const mine = current.players.find((p) => p.id === meId);
    void load(mine?.path.at(-1) ?? current.startArticle);
  }, [phase, round, meId, load]);

  const timeLeftMs =
    phase === "playing" && room?.timeLimit && room.roundStart
      ? room.roundStart + room.timeLimit * 1000 - now
      : null;
  useEffect(() => {
    if (timeLeftMs !== null && timeLeftMs <= 0 && sentTimeUp.current !== round) {
      sentTimeUp.current = round;
      void send({ action: "timeUp" });
    }
  }, [timeLeftMs, round, send]);

  const canPlay = phase === "playing" && !!me && !me.hasWon && !me.hasSurrendered;

  const navigate = useCallback(
    async (target: string) => {
      if (!canPlay || loadingRef.current) return;
      const canonical = await load(target);
      if (canonical) await send({ action: "navigate", article: canonical });
    },
    [canPlay, load, send],
  );

  const goBack = useCallback(async () => {
    const path = me?.path ?? [];
    if (!canPlay || loadingRef.current || path.length < 2) return;
    const canonical = await load(path[path.length - 2]);
    if (canonical) await send({ action: "navigate", article: canonical });
  }, [canPlay, me, load, send]);

  return {
    room,
    me,
    isHost: !!me?.isHost,
    error,
    busy,
    html,
    title,
    loading,
    loadError,
    canPlay,
    countdown: countdownMs === null ? null : Math.max(0, Math.ceil(countdownMs / 1000)),
    elapsed:
      room?.roundStart && phase === "playing" ? Math.max(0, (now - room.roundStart) / 1000) : 0,
    timeLeft: timeLeftMs === null ? null : Math.max(0, Math.ceil(timeLeftMs / 1000)),
    create,
    join,
    leave,
    send,
    navigate,
    goBack,
    clearError: () => setError(null),
    retry: () => {
      const last = me?.path.at(-1) ?? room?.startArticle;
      if (last) void load(last);
    },
  };
}
