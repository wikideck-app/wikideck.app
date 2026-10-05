"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BattleGameInput, BattlePuzzle } from "@wikideck/shared";
import { apiCall } from "@/lib/tags-api";
import { fetchArticle, normalizeTitle } from "@/lib/wiki-client";

export type BattlePhase = "setup" | "playing" | "won";

const STORAGE_KEY = "wikideck:battle";

type Saved = {
  puzzle: BattlePuzzle;
  history: string[];
  clicks: number;
  elapsedMs: number;
  started: boolean;
};

const read = (): Saved | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
};
const write = (saved: Saved | null) => {
  try {
    if (saved) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
};

export function useBattleGame({ apiUrl, onFinished }: { apiUrl: string; onFinished: () => void }) {
  const [phase, setPhase] = useState<BattlePhase>("setup");
  const [puzzle, setPuzzle] = useState<BattlePuzzle | null>(null);
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [clicks, setClicks] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const clicksRef = useRef(0);
  const pathRef = useRef<string[]>([]);
  const puzzleRef = useRef<BattlePuzzle | null>(null);
  const loadingRef = useRef(false);
  const endedRef = useRef(false);
  const startedAt = useRef<number | null>(null);
  const finished = useRef(onFinished);
  useEffect(() => {
    finished.current = onFinished;
  });

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      if (startedAt.current !== null) setElapsed((performance.now() - startedAt.current) / 1000);
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  const elapsedNow = () =>
    startedAt.current === null ? 0 : (performance.now() - startedAt.current) / 1000;

  const persist = () => {
    if (!puzzleRef.current) return;
    write({
      puzzle: puzzleRef.current,
      history: pathRef.current,
      clicks: clicksRef.current,
      elapsedMs: elapsedNow() * 1000,
      started: startedAt.current !== null,
    });
  };

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

  const save = useCallback(
    async (won: boolean, seconds: number) => {
      const p = puzzleRef.current;
      if (!p) return;
      const game: BattleGameInput = {
        start: p.start,
        target: p.target,
        path: pathRef.current,
        clicks: clicksRef.current,
        timeSeconds: seconds,
        won,
      };
      await apiCall(apiUrl, "/battle/games", "POST", game);
      finished.current();
    },
    [apiUrl],
  );

  const startClock = () => {
    if (startedAt.current === null) startedAt.current = performance.now();
  };

  const start = useCallback(
    async (chosen: BattlePuzzle) => {
      clicksRef.current = 0;
      setClicks(0);
      pathRef.current = [];
      setHistory([]);
      startedAt.current = null;
      endedRef.current = false;
      setElapsed(0);
      puzzleRef.current = chosen;
      setPuzzle(chosen);
      setHtml("");
      setTitle("");
      const canonical = await load(chosen.start);
      if (!canonical) return false;
      pathRef.current = [canonical];
      setHistory([canonical]);
      setPhase("playing");
      persist();
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [load],
  );

  const navigate = useCallback(
    async (target: string) => {
      if (loadingRef.current || endedRef.current || !puzzleRef.current) return;
      clicksRef.current += 1;
      setClicks(clicksRef.current);
      startClock();
      const canonical = await load(target);
      if (!canonical) return;
      pathRef.current = [...pathRef.current, canonical];
      setHistory(pathRef.current);
      window.scrollTo({ top: 0 });
      if (normalizeTitle(canonical) === normalizeTitle(puzzleRef.current.target)) {
        endedRef.current = true;
        const seconds = elapsedNow();
        setElapsed(seconds);
        startedAt.current = null;
        setPhase("won");
        write(null);
        void save(true, seconds);
      } else persist();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [load, save],
  );

  const goBack = useCallback(async () => {
    if (loadingRef.current || endedRef.current || pathRef.current.length <= 1) return;
    clicksRef.current += 1;
    setClicks(clicksRef.current);
    startClock();
    const previous = pathRef.current.slice(0, -1);
    const canonical = await load(previous[previous.length - 1]);
    if (!canonical) return;
    pathRef.current = previous;
    setHistory(previous);
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const giveUp = useCallback(() => {
    if (!endedRef.current && clicksRef.current > 0) void save(false, elapsedNow());
    endedRef.current = true;
    startedAt.current = null;
    write(null);
    setPhase("setup");
    setHtml("");
    setTitle("");
    setPuzzle(null);
    puzzleRef.current = null;
    setLoadError(null);
  }, [save]);

  const reset = useCallback(() => {
    write(null);
    setPhase("setup");
    setHtml("");
    setTitle("");
    setPuzzle(null);
    puzzleRef.current = null;
  }, []);

  useEffect(() => {
    const saved = read();
    if (!saved?.history.length) return;
    puzzleRef.current = saved.puzzle;
    pathRef.current = saved.history;
    clicksRef.current = saved.clicks;
    endedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPuzzle(saved.puzzle);
    setHistory(saved.history);
    setClicks(saved.clicks);
    setElapsed(saved.elapsedMs / 1000);
    void load(saved.history[saved.history.length - 1]).then((ok) => {
      if (!ok) return write(null);
      startedAt.current = saved.started ? performance.now() - saved.elapsedMs : null;
      setPhase("playing");
    });
  }, [load]);

  return {
    phase,
    puzzle,
    html,
    title,
    loading,
    loadError,
    history,
    clicks,
    elapsed,
    canGoBack: history.length > 1,
    start,
    navigate,
    goBack,
    giveUp,
    reset,
    retry: () => (title || history.length ? load(history[history.length - 1] ?? title) : null),
  };
}
