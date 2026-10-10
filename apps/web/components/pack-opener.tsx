"use client";

import { ChevronLeft, ChevronRight } from "@/components/icons";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OpenPackResponse, PackKind, PackStatus, TagDto } from "@wikideck/shared";
import { CardDetail } from "@/components/card-detail";
import { SellDialog } from "@/components/market/sell-dialog";
import { RecycleDialog } from "@/components/recycle-dialog";
import { TagEditor } from "@/components/tag-editor";
import { FlipCard } from "@/components/wiki-card";
import { LegendaryReveal } from "@/components/legendary-reveal";
import { playLegendary, sfx } from "@/lib/audio";
import { useSettings } from "@/lib/settings-context";

const MIN_SHAKE_MS = 400;
const BURST_MS = 1300;
const AUTO_FLIP_MS = 350;
const QUEUE_RETRY_MS = 3000;
const QUEUE_MAX_TRIES = 10;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}

const JAG: [number, number][] = [
  [0, 17],
  [8, 15.5],
  [15, 18],
  [23, 15],
  [31, 18.5],
  [39, 15.5],
  [47, 18],
  [55, 15],
  [63, 18.5],
  [71, 15.5],
  [79, 18],
  [86, 15],
  [93, 18.5],
  [100, 16],
];
const jagY = (x: number) => {
  const i = JAG.findIndex(([jx]) => jx >= x);
  if (i <= 0) return JAG[0][1];
  const [x0, y0] = JAG[i - 1];
  const [x1, y1] = JAG[i];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
};
const poly = (pts: [number, number][]) =>
  `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
const bottomClip = () => poly([[0, 100], [100, 100], ...[...JAG].reverse()]);
const tornClip = (t: number) => {
  const x = t * 100;
  const cut = JAG.filter(([jx]) => jx < x);
  return poly([[0, 0], [x, 0], [x, jagY(x)], ...[...cut].reverse()]);
};
const attachedClip = (t: number) => {
  const x = t * 100;
  const rest = JAG.filter(([jx]) => jx > x);
  return poly([[x, 0], [100, 0], ...[...rest].reverse(), [x, jagY(x)]]);
};

function PackHalf({
  className = "",
  priority,
  style,
}: {
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}) {
  const t = useTranslations("packs");
  return (
    <Image
      src="/paquet.webp"
      alt={priority ? t("packAlt") : ""}
      width={1101}
      height={1426}
      priority={priority}
      draggable={false}
      style={style}
      className={`absolute inset-0 size-full ${className}`}
    />
  );
}

const PackStage3D = dynamic(() => import("@/components/pack-stage-3d").then((m) => m.PackStage3D), {
  ssr: false,
  loading: () => <div className="h-104 w-88 max-w-full" />,
});

type Phase = "idle" | "shaking" | "bursting" | "reveal";

export function PackOpener({
  initial,
  apiUrl,
  tags = [],
}: {
  initial: PackStatus;
  apiUrl: string;
  tags?: TagDto[];
}) {
  const t = useTranslations("packs");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const { settings } = useSettings();
  const { skip, speed } = settings.animations;
  const [full, setStatus] = useState(initial);
  // paquets Wikipédia (réserve principale) ou anime / manga (réserve séparée)
  const [kind, setKind] = useState<PackKind>("wikipedia");
  const status: PackStatus =
    kind === "anime" && full.anime ? { ...full.anime, boosts: 0 } : full;
  const [useBoost, setUseBoost] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<OpenPackResponse["cards"]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selling, setSelling] = useState(false);
  const [recycling, setRecycling] = useState(false);
  const [allTags, setAllTags] = useState(tags);
  const [queued, setQueued] = useState(false);
  const [tear, setTear] = useState(0);
  const [torn, setTorn] = useState(false);
  const [godpack, setGodpack] = useState(false);
  const [avoided, setAvoided] = useState(0);
  const [cinematic, setCinematic] = useState<{
    index: number;
    duration: number;
  } | null>(null);
  const legendaryAudio = useRef<ReturnType<typeof playLegendary>>(null);
  const [fallback2d, setFallback2d] = useState(false);
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dueOf = (s: { nextInMs: number | null } | undefined) =>
    !s || s.nextInMs === null ? null : Date.now() + s.nextInMs;
  const [deadlines, setDeadlines] = useState<Record<PackKind, number | null>>(() => ({
    wikipedia: dueOf(initial),
    anime: dueOf(initial.anime),
  }));
  const deadline = deadlines[kind];
  const [remaining, setRemaining] = useState<number | null>(initial.nextInMs);

  const applyStatus = useCallback(
    (next: PackStatus) => {
      setStatus(next);
      setDeadlines({ wikipedia: dueOf(next), anime: dueOf(next.anime) });
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const left = deadline - Date.now();
      if (left > 0) return setRemaining(left);
      fetch(`${apiUrl}/packs`, { credentials: "include" })
        .then((r) => (r.ok ? (r.json() as Promise<PackStatus>) : null))
        .then((next) => next && applyStatus(next));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, apiUrl, applyStatus]);

  const backToIdle = useCallback(() => {
    legendaryAudio.current?.stop();
    legendaryAudio.current = null;
    setCinematic(null);
    setTorn(false);
    setTear(0);
    setGodpack(false);
    setPhase("idle");
  }, []);

  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const flippedRef = useRef(flipped);
  useEffect(() => {
    flippedRef.current = flipped;
  });

  const reveal = useCallback(
    (i: number) => {
      const card = cards[i];
      if ((card.rarity === "LEGENDARY" || card.rarity === "MYTHIC") && !skip) {
        const audio = playLegendary(card.rarity === "MYTHIC");
        if (audio) {
          legendaryAudio.current = audio;
          setCinematic({ index: i, duration: audio.duration });
          return;
        }
      }
      setFlipped((prev) => new Set(prev).add(i));
      sfx.reveal(card.rarity);
    },
    [cards, skip],
  );

  useEffect(() => {
    if (phase !== "reveal" || skip) return;
    const id = setTimeout(() => {
      if (!flippedRef.current.has(index)) reveal(index);
    }, AUTO_FLIP_MS / speed);
    return () => clearTimeout(id);
  }, [phase, index, skip, speed, reveal]);

  const go = useCallback(
    (to: number) => setIndex(Math.min(cards.length - 1, Math.max(0, to))),
    [cards.length],
  );

  const open = useCallback(async () => {
    setError(null);
    setTorn(true);
    sfx.open();
    setPhase("shaking");
    const started = Date.now();
    try {
      let res: Response;
      for (let tries = 0; ; tries++) {
        res = await fetch(`${apiUrl}/packs/open`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boost: useBoost && kind === "wikipedia", kind }),
        });
        if (res.status !== 503) break;
        if (tries >= QUEUE_MAX_TRIES) {
          setError(t("errors.overloaded"));
          backToIdle();
          return;
        }
        setQueued(true);
        await wait(QUEUE_RETRY_MS);
      }
      setQueued(false);
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string" && t.has(`errors.${data.error}` as never)
            ? t(`errors.${data.error}` as never)
            : tc("errors.generic"),
        );
        if (typeof data.packs === "number") applyStatus(data);
        backToIdle();
        return;
      }
      const result = data as OpenPackResponse;
      setGodpack(!!result.godpack);
      setAvoided(result.duplicatesAvoided ?? 0);
      if (!skip) {
        await wait(Math.max(0, MIN_SHAKE_MS / speed - (Date.now() - started)));
        setPhase("bursting");
        await wait(BURST_MS / speed);
      }
      setCards(result.cards);
      setIndex(0);
      setFlipped(skip ? new Set(result.cards.map((_, i) => i)) : new Set());
      if (skip) sfx.reveal(result.cards[result.cards.length - 1].rarity);
      applyStatus(result);
      setUseBoost(false);
      if (result.godpack && !skip) sfx.reveal("ULTRA_RARE");
      setPhase("reveal");
    } catch {
      setError(tc("errors.network"));
      backToIdle();
    } finally {
      setQueued(false);
    }
  }, [apiUrl, applyStatus, backToIdle, kind, skip, speed, useBoost, t, tc]);

  const revealCurrent = useCallback(() => reveal(index), [reveal, index]);

  useEffect(() => {
    const ignored = (e: KeyboardEvent) =>
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      !!(e.target as HTMLElement).closest("input, textarea, select");

    const onKeyDown = (e: KeyboardEvent) => {
      if (ignored(e)) return;
      const key = e.key.toLowerCase();

      if (cinematic) return;

      if (phase === "idle") {
        if (key === " ") {
          e.preventDefault();
          if (status.packs >= 1 && !e.repeat) void open();
        }
        return;
      }
      if (phase !== "reveal") return;

      const card = cards[index];
      if (key === "w") return void window.open(card.url, "_blank", "noopener");
      if (key === "e") {
        e.preventDefault();
        if (detailOpen) setDetailOpen(false);
        else if (flipped.has(index)) setDetailOpen(true);
        else revealCurrent();
        return;
      }
      if (detailOpen) return;

      if (key === " ") {
        e.preventDefault();
        if (!e.repeat) backToIdle();
      } else if (key === "arrowright") setIndex((i) => Math.min(cards.length - 1, i + 1));
      else if (key === "arrowleft") setIndex((i) => Math.max(0, i - 1));
      else if (key === "arrowup") {
        e.preventDefault();
        setIndex(0);
      } else if (key === "arrowdown") {
        e.preventDefault();
        setIndex(cards.length - 1);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " " && !ignored(e) && phase !== "shaking" && phase !== "bursting")
        e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    phase,
    cards,
    index,
    flipped,
    detailOpen,
    cinematic,
    status.packs,
    open,
    revealCurrent,
    backToIdle,
  ]);

  if (phase === "reveal") {
    const last = index === cards.length - 1;
    const left = cards.length - index - 1;
    return (
      <div className="relative z-10 mt-6 flex w-full flex-col items-center gap-6">
        {godpack && (
          <>
            <div aria-hidden className="godpack-aura" />
            <div role="status" className="godpack-banner">
              <span>{t("godPack")}</span>
              <small>{t("godPackText")}</small>
            </div>
          </>
        )}
        {avoided > 0 && (
          <p role="status" className="text-xs font-semibold text-success">
            {t("duplicates.avoided", { count: avoided })}
          </p>
        )}
        <p className="text-sm opacity-60">
          {t.rich("cardOf", {
            index: index + 1,
            total: cards.length,
            strong: (chunks) => <span className="text-lg font-bold text-foreground">{chunks}</span>,
          })}
        </p>

        <div
          className="touch-pan-y"
          onTouchStart={(e) => {
            const t0 = e.touches[0];
            swipeStart.current = e.touches.length === 1 ? { x: t0.clientX, y: t0.clientY } : null;
          }}
          onTouchEnd={(e) => {
            const start = swipeStart.current;
            swipeStart.current = null;
            if (!start || detailOpen || cinematic) return;
            const t0 = e.changedTouches[0];
            const dx = t0.clientX - start.x;
            const dy = t0.clientY - start.y;
            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
            go(index + (dx < 0 ? 1 : -1));
          }}
          onTouchCancel={() => {
            swipeStart.current = null;
          }}
        >
          <FlipCard
            key={index}
            card={cards[index]}
            isNew={cards[index].isNew}
            flipped={flipped.has(index)}
            onToggle={() => (flipped.has(index) ? setDetailOpen(true) : revealCurrent())}
            className="animate-card-enter w-72 sm:w-80"
          />
        </div>

        {cinematic && (
          <LegendaryReveal
            card={cards[cinematic.index]}
            isNew={cards[cinematic.index].isNew}
            duration={cinematic.duration}
            flipped={flipped.has(cinematic.index)}
            onImpact={() => setFlipped((prev) => new Set(prev).add(cinematic.index))}
            onSkip={() => {
              legendaryAudio.current?.stop();
              legendaryAudio.current = null;
              setFlipped((prev) => new Set(prev).add(cinematic.index));
              setCinematic(null);
            }}
            onDone={() => {
              legendaryAudio.current = null;
              setCinematic(null);
            }}
          />
        )}

        {flipped.has(index) && (
          <p className="-mt-3 text-xs opacity-50">{t("tapDetails")}</p>
        )}
        <p className="hidden text-xs opacity-40 sm:block">
          {t("shortcuts")}
        </p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={t("previous")}
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="flex size-12 items-center justify-center rounded-full bg-foreground/10 disabled:opacity-30"
          >
            <ChevronLeft />
          </button>
          <div className="flex gap-2" aria-hidden>
            {cards.map((_, i) => (
              <span
                key={i}
                className={`size-2.5 rounded-full transition ${i === index ? "bg-foreground" : "bg-foreground/20"}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label={t("next")}
            onClick={() => go(index + 1)}
            disabled={last}
            className="flex size-12 items-center justify-center rounded-full bg-foreground/10 disabled:opacity-30"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => (last ? backToIdle() : go(index + 1))}
            className="rounded-lg bg-accent px-8 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/70"
          >
            {last ? t("finish") : t("more", { count: left })}
          </button>

          {last && status.packs > 0 && (
            <button
              type="button"
              onClick={() => {
                backToIdle();
                open();
              }}
              className="rounded-lg border border-foreground/20 px-8 py-2.5 text-sm font-bold transition hover:bg-foreground/10"
            >
              {t("nextPack", { count: status.packs })}
            </button>
          )}
        </div>

        {detailOpen && (
          <CardDetail
            card={cards[index]}
            quantity={cards[index].quantity}
            apiUrl={apiUrl}
            onClose={() => {
              setDetailOpen(false);
              setSelling(false);
              setRecycling(false);
            }}
            onSell={() => setSelling(true)}
            onRecycle={() => setRecycling(true)}
          >
            <TagEditor
              apiUrl={apiUrl}
              cardId={cards[index].id}
              cardTags={cards[index].tags}
              allTags={allTags}
              onChange={(cardTags, all) => {
                setAllTags(all);
                setCards((prev) =>
                  prev.map((c) => (c.id === cards[index].id ? { ...c, tags: cardTags } : c)),
                );
              }}
            />
          </CardDetail>
        )}

        {detailOpen && recycling && (
          <RecycleDialog
            apiUrl={apiUrl}
            lines={[{ card: cards[index], quantity: 1 }]}
            onClose={() => setRecycling(false)}
            onDone={(_result, lines) => {
              setCards((prev) =>
                prev.map((c) =>
                  c.id === lines[0].card.id ? { ...c, quantity: c.quantity - 1 } : c,
                ),
              );
              router.refresh();
            }}
          />
        )}

        {detailOpen && selling && (
          <SellDialog
            apiUrl={apiUrl}
            initialCard={cards[index]}
            onClose={() => setSelling(false)}
            onListed={(card) =>
              setCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, quantity: c.quantity - 1 } : c)),
              )
            }
          />
        )}
      </div>
    );
  }

  const dragStart = (e: React.PointerEvent<HTMLElement>) => {
    if (phase !== "idle" || status.packs < 1) return;
    const box = e.currentTarget.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, w: box.width, h: box.height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const dragMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const along = (e.clientX - d.x) / (d.w * 0.7);
    setTear(Math.min(1, Math.max(0, along)));
  };
  const dragEnd = () => {
    if (!drag.current) return;
    drag.current = null;
    if (tear >= 0.85) {
      navigator.vibrate?.(30);
      void open();
    } else setTear(0);
  };

  const busy = phase !== "idle";
  const canTear = !busy && status.packs >= 1;
  const tearAngle = torn ? 55 : tear * 55;
  return (
    <div className="flex flex-col items-center">
      {full.anime && (
        <div
          role="tablist"
          aria-label={t("kind.label")}
          className="mt-6 flex gap-1 rounded-2xl border border-line p-1"
        >
          {(["wikipedia", "anime"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              disabled={phase !== "idle"}
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                kind === k ? "bg-accent text-accent-foreground" : "hover:bg-foreground/10"
              }`}
            >
              {t(`kind.${k}`)}{" "}
              <span className="tabular-nums opacity-70">
                {k === "anime" ? full.anime!.packs : full.packs}
              </span>
            </button>
          ))}
        </div>
      )}
      {(full.duplicateShield ?? 0) > 0 || full.duplicateReductionUntil ? (
        <ul className="mt-4 flex flex-col items-center gap-1 text-xs text-pale-mist">
          {(full.duplicateShield ?? 0) > 0 && (
            <li>{t("duplicates.shield", { count: full.duplicateShield ?? 0 })}</li>
          )}
          {full.duplicateReductionUntil && (
            <li>
              {t("duplicates.reduction", {
                date: format.dateTime(new Date(full.duplicateReductionUntil), "mediumTime"),
              })}
            </li>
          )}
        </ul>
      ) : null}
      <div
        className="mt-6 flex items-center justify-center"
        style={kind === "anime" ? { filter: "hue-rotate(155deg) saturate(1.15)" } : undefined}
      >
        {fallback2d ? (
          <div className="px-14 py-8">
            <div
              onPointerDown={dragStart}
              onPointerMove={dragMove}
              onPointerUp={dragEnd}
              onPointerCancel={dragEnd}
              className={`relative aspect-1101/1426 h-80 touch-none select-none ${
                canTear ? "cursor-grab active:cursor-grabbing" : ""
              } ${phase === "shaking" && !skip ? "animate-pack-shake" : ""}`}
            >
              <PackHalf
                priority
                style={{ clipPath: bottomClip() }}
                className={phase === "bursting" ? "animate-pack-tear-bottom" : ""}
              />
              <div
                aria-hidden
                style={{
                  width: `${(torn ? 1 : tear) * 84}%`,
                  opacity: phase === "bursting" || tear === 0 ? 0 : 1,
                }}
                className="absolute left-[8%] top-[15.5%] h-[2.5%] rounded-full bg-[linear-gradient(to_right,rgb(255_196_70),white_60%,rgb(255_226_140))] shadow-[0_-4px_16px_4px_rgb(255_200_80/0.85)] transition-opacity duration-200"
              />
              <PackHalf
                className={torn ? "animate-pack-tear-top" : ""}
                style={
                  {
                    clipPath: tornClip(torn ? 1 : tear),
                    transformOrigin: `${(torn ? 1 : tear) * 100}% 17%`,
                    "--a": `${tearAngle}deg`,
                    transform: torn ? undefined : `rotate(${tearAngle}deg)`,
                  } as React.CSSProperties
                }
              />
              {!torn && tear < 1 && <PackHalf style={{ clipPath: attachedClip(tear) }} />}
              {canTear && tear === 0 && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-[7%] flex items-center justify-center text-white"
                >
                  <ChevronRight className="size-6 animate-pulse drop-shadow" />
                  <ChevronRight className="-ml-3 size-6 animate-pulse drop-shadow" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <PackStage3D
            phase={phase}
            torn={torn}
            canTear={canTear}
            speed={speed}
            godpack={godpack}
            onTear={() => void open()}
            onFail={() => setFallback2d(true)}
          />
        )}
      </div>
      {canTear && (
        <p className="mt-3 text-xs opacity-60">
          {t("dragHint")}
        </p>
      )}

      <button
        type="button"
        onClick={open}
        disabled={busy || status.packs < 1}
        className="mt-6 rounded-lg bg-accent px-8 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/70 disabled:opacity-40"
      >
        {busy ? t("opening") : t("open")}
      </button>
      {(status.boosts ?? 0) > 0 && (
        <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm">
          <input
            type="checkbox"
            checked={useBoost}
            disabled={busy}
            onChange={(e) => setUseBoost(e.target.checked)}
          />
          <span>
            {t.rich("boost", {
              count: status.boosts ?? 0,
              muted: (chunks) => <span className="opacity-60">{chunks}</span>,
            })}
          </span>
        </label>
      )}
      {useBoost && (
        <p className="mt-1 max-w-xs text-center text-xs opacity-60">
          {t("boostNext")}
        </p>
      )}
      {queued && (
        <p role="status" className="mt-2 text-xs opacity-60">
          {t("queued")}
        </p>
      )}
      {!busy && status.packs >= 1 && (
        <p className="mt-1 hidden text-xs opacity-40 sm:block">{t("spaceHint")}</p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-8 rounded-xl border border-line bg-surface px-8 py-4 text-center">
        <p className="text-xl font-bold">
          <span>{status.packs}</span>
          <span className="opacity-50"> / {status.max}</span>
        </p>
        <p className="text-xs opacity-60">{t("available")}</p>
        {deadline !== null && remaining !== null && (
          <p className="mt-1 text-xs opacity-60">
            {t.rich("nextIn", {
              time: formatCountdown(remaining),
              mono: (chunks) => <span className="font-mono text-foreground">{chunks}</span>,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
