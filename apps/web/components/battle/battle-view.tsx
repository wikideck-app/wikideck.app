"use client";

import { ArrowRight, Check, Search, Swords, X } from "@/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BattleGameDto, BattleHistoryResponse, BattlePuzzle } from "@wikideck/shared";
import { ArticlePane } from "@/components/battle/article-pane";
import { BattleMulti } from "@/components/battle/battle-multi";
import { useBattleGame } from "@/components/battle/use-battle-game";
import { buttonClass, primaryButtonClass } from "@/components/settings/controls";
import { apiFetch } from "@/lib/tags-api";

const SEARCH_KEY = "wikideck:battle-search";
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const panel = "rounded-xl border border-line bg-surface p-5";
const heading = "text-xs font-bold uppercase tracking-[0.2em] text-fog";

function fmt(seconds: number) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 text-center">
      <div className="font-display text-3xl font-medium tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-fog">{label}</div>
    </div>
  );
}

function Path({ path, won }: { path: string[]; won?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-pale-mist">
      {path.map((title, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="opacity-40">›</span>}
          <span className={i === path.length - 1 && won ? "font-bold text-success" : ""}>
            {title}
          </span>
        </span>
      ))}
    </div>
  );
}

function GameRow({ game }: { game: BattleGameDto }) {
  return (
    <li className="rounded-xl border border-line p-3.5">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
            game.won ? "bg-success/15 text-success" : "bg-foreground/10 text-fog"
          }`}
          title={game.won ? "Cible atteinte" : "Abandon"}
        >
          {game.won ? <Check className="size-4" /> : <X className="size-4" />}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          {game.mode === "multi" && (
            <span className="mr-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
              Multi
            </span>
          )}
          <span className="font-semibold">{game.start}</span>
          <span className="mx-1.5 opacity-40">→</span>
          <span className="font-semibold text-accent">{game.target}</span>
        </div>
        <div className="shrink-0 text-right text-xs tabular-nums text-fog">
          <div>
            {game.clicks} clic{game.clicks > 1 ? "s" : ""} · {fmt(game.timeSeconds)}
          </div>
          <div>{dateFmt.format(new Date(game.playedAt))}</div>
        </div>
      </div>
    </li>
  );
}

function SoloBattle({
  initial,
  apiUrl,
}: {
  initial: BattleHistoryResponse | null;
  apiUrl: string;
}) {
  const [data, setData] = useState(initial);
  const [preview, setPreview] = useState<BattlePuzzle | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [searchAllowed, setSearchAllowed] = useState(false);
  const crumbsEnd = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await apiFetch<BattleHistoryResponse>(apiUrl, "/battle/games");
    if (res.ok) setData(res.data);
  }, [apiUrl]);

  const game = useBattleGame({ apiUrl, onFinished: refresh });
  const { phase } = game;

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchAllowed(localStorage.getItem(SEARCH_KEY) === "true");
    } catch {}
  }, []);
  const toggleSearch = () =>
    setSearchAllowed((prev) => {
      try {
        localStorage.setItem(SEARCH_KEY, String(!prev));
      } catch {}
      return !prev;
    });

  const drawing = useRef(false);
  const draw = useCallback(async () => {
    if (drawing.current) return;
    drawing.current = true;
    setPreview(null);
    setPreviewError(null);
    const res = await apiFetch<BattlePuzzle>(apiUrl, "/battle/puzzle");
    drawing.current = false;
    if (res.ok) setPreview(res.data);
    else setPreviewError(res.message);
  }, [apiUrl]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (phase === "setup" && !preview && !previewError) void draw();
  }, [phase, preview, previewError, draw]);

  useEffect(() => {
    if (phase !== "playing" || searchAllowed) return;
    const block = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", block, { capture: true });
    return () => window.removeEventListener("keydown", block, { capture: true });
  }, [phase, searchAllowed]);

  const { goBack } = game;
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace") return;
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      e.preventDefault();
      void goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, goBack]);

  useEffect(() => {
    crumbsEnd.current?.scrollIntoView({ block: "nearest", inline: "end" });
  }, [game.history]);

  useEffect(() => {
    if (phase !== "playing") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  const start = async () => {
    if (!preview) return;
    const chosen = preview;
    setPreview(null);
    const ok = await game.start(chosen);
    if (!ok) setPreview(chosen);
  };

  if (phase === "won" && game.puzzle) {
    const best = data?.stats.bestClicks;
    return (
      <div className={`${panel} mx-auto mt-8 max-w-xl text-center`}>
        <Swords className="mx-auto size-10 text-accent" />
        <h2 className="mt-2 font-display text-4xl font-medium">Cible atteinte !</h2>
        <p className="prose-serif mt-1 text-pale-mist">
          {game.puzzle.start} <span className="opacity-50">→</span>{" "}
          <strong className="text-foreground">{game.puzzle.target}</strong>
        </p>
        <div className="mt-5 flex justify-center gap-4">
          <Stat value={game.clicks} label={game.clicks > 1 ? "clics" : "clic"} />
          <Stat value={fmt(game.elapsed)} label="temps" />
        </div>
        {best != null && game.clicks <= best && data!.stats.wins > 0 && (
          <p className="mt-3 text-sm font-bold text-accent">Votre meilleur nombre de clics !</p>
        )}
        <div className="mt-5 rounded-xl border border-line p-3.5 text-left">
          <Path path={game.history} won />
        </div>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" className={primaryButtonClass} onClick={game.reset}>
            Nouvelle partie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className={panel}>
        <h2 className={heading}>Nouvelle partie</h2>
        <p className="prose-serif mt-2 text-pale-mist">
          Rejoignez l&apos;article cible en cliquant uniquement sur les liens de chaque page. Le
          chrono démarre à votre premier clic, et revenir en arrière compte pour un clic.
        </p>

        <div className="mt-5 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-xl border border-line p-4 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-fog">Départ</div>
            <div className="mt-1 min-h-6 font-display text-xl font-medium">
              {preview?.start ?? (previewError ? "—" : "…")}
            </div>
          </div>
          <ArrowRight className="mx-auto size-5 rotate-90 text-fog sm:rotate-0" />
          <div className="rounded-xl border-2 border-accent p-4 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-fog">Cible</div>
            <div className="mt-1 min-h-6 font-display text-xl font-medium text-accent">
              {preview?.target ?? (previewError ? "—" : "…")}
            </div>
          </div>
        </div>
        {previewError && <p className="mt-3 text-sm text-danger">{previewError}</p>}
        {game.loadError && <p className="mt-3 text-sm text-danger">{game.loadError}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={start}
            disabled={!preview || game.loading}
          >
            {game.loading ? "Préparation…" : "Commencer"}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              setPreview(null);
              setPreviewError(null);
              void draw();
            }}
            disabled={game.loading}
          >
            Autre paire
          </button>
        </div>

        <button
          type="button"
          onClick={toggleSearch}
          className="mt-5 flex w-full items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 text-left text-sm"
        >
          <span className="flex items-center gap-2">
            <Search className="size-4 text-fog" />
            Recherche dans la page (Ctrl+F)
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              searchAllowed ? "bg-accent/15 text-accent" : "bg-foreground/10 text-fog"
            }`}
          >
            {searchAllowed ? "Autorisée" : "Bloquée"}
          </span>
        </button>
      </section>

      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <Stat value={data?.stats.played ?? 0} label="parties" />
          <Stat value={data?.stats.wins ?? 0} label="victoires" />
          <Stat value={data?.stats.bestClicks ?? "—"} label="meilleur (clics)" />
          <Stat
            value={data?.stats.bestTime != null ? fmt(data.stats.bestTime) : "—"}
            label="meilleur temps"
          />
        </div>
        <div className={panel}>
          <h2 className={heading}>Dernières parties</h2>
          {data?.games.length ? (
            <ul className="mt-3 flex flex-col gap-2.5">
              {data.games.map((g) => (
                <GameRow key={g.id} game={g} />
              ))}
            </ul>
          ) : (
            <p className="prose-serif mt-3 text-pale-mist">Aucune partie pour le moment.</p>
          )}
        </div>
      </section>

      {phase === "playing" &&
        game.puzzle &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex flex-col bg-background text-foreground">
            <div className="flex flex-col gap-1.5 border-b border-line bg-surface px-3 py-2 sm:px-4">
              <div className="flex justify-center">
                <span className="rounded-[20px] bg-accent px-3 py-0.5 text-sm font-bold text-accent-foreground">
                  Cible : {game.puzzle.target}
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div className="flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {game.history.map((title, i) => (
                    <span key={i} className="flex shrink-0 items-center">
                      {i > 0 && <span className="px-1 opacity-40">›</span>}
                      <span className={i === game.history.length - 1 ? "font-bold" : "opacity-60"}>
                        {title}
                      </span>
                    </span>
                  ))}
                  <div ref={crumbsEnd} />
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs font-bold tabular-nums text-fog">
                  <span>{fmt(game.elapsed)}</span>
                  <span>
                    {game.clicks} clic{game.clicks > 1 ? "s" : ""}
                  </span>
                </div>
                {game.canGoBack && (
                  <button
                    type="button"
                    onClick={() => void game.goBack()}
                    disabled={game.loading}
                    title="Retour (Retour arrière) : compte pour un clic"
                    className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:bg-foreground/10 disabled:opacity-40"
                  >
                    ← +1
                  </button>
                )}
                <button
                  type="button"
                  onClick={game.giveUp}
                  className="shrink-0 rounded-full border border-danger/50 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
                >
                  Abandonner
                </button>
              </div>
            </div>

            <ArticlePane
              title={game.title}
              html={game.html}
              loading={game.loading}
              loadError={game.loadError}
              onNavigate={(t) => void game.navigate(t)}
              onRetry={game.retry}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

type Tab = "multi" | "solo";

export function BattleView({
  initial,
  apiUrl,
  meId,
  initialCode = "",
}: {
  initial: BattleHistoryResponse | null;
  apiUrl: string;
  meId: string;
  initialCode?: string;
}) {
  const [tab, setTab] = useState<Tab>("multi");
  const tabs: { value: Tab; label: string }[] = [
    { value: "multi", label: "Multijoueur" },
    { value: "solo", label: "Entraînement solo" },
  ];
  return (
    <div className="mt-6">
      <div className="mx-auto flex w-fit gap-1 rounded-full border border-line p-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.value ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "multi" ? (
        <BattleMulti apiUrl={apiUrl} meId={meId} initialCode={initialCode} />
      ) : (
        <SoloBattle initial={initial} apiUrl={apiUrl} />
      )}
    </div>
  );
}
