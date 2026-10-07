"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BOOST_MYTHIC_RATE,
  MYTHIC_RATE,
  WHEEL_PRIZES,
  wheelPrizeLabel,
  type WheelHistoryEntry,
  type WheelHistoryResponse,
  type WheelPrize,
  type WheelSpinResponse,
} from "@wikideck/shared";
import { primaryButtonClass } from "@/components/settings/controls";
import { Wikibits } from "@/components/wikibit";
import { sfx } from "@/lib/audio";
import { apiCall } from "@/lib/tags-api";

const CX = 400;
const CY = 470;
const R = 320;
const STEP = 360 / WHEEL_PRIZES.length;
const COLORS = ["#8b4fe0", "#f59e1b", "#2fc48a", "#2f86f0"];
const SPIN_MS = 5200;

const point = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)] as const;
};

function sector(i: number) {
  const [x1, y1] = point(i * STEP - STEP / 2, R);
  const [x2, y2] = point(i * STEP + STEP / 2, R);
  return `M${CX} ${CY} L${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
}

const TOTAL_WEIGHT = WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0);
const percentFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

const prizeLabel = (p: WheelPrize) =>
  p.kind === "wikibits"
    ? `${p.amount} wikibits`
    : p.kind === "boost"
      ? "Booster de chance"
      : `${p.amount} paquet${p.amount > 1 ? "s" : ""}`;

const prizeText = (p: WheelPrize) =>
  p.kind === "wikibits"
    ? { big: String(p.amount), small: "wikibits" }
    : p.kind === "boost"
      ? { big: "✦", small: "booster" }
      : { big: `+${p.amount}`, small: p.amount > 1 ? "paquets" : "paquet" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

function HistoryList({ title, entries }: { title: string; entries: WheelHistoryEntry[] }) {
  return (
    <section className="min-w-0">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{title}</h2>
      {entries.length ? (
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          {entries.map((e, i) => (
            <li key={`${e.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2">
              {e.player !== undefined && (
                <span className="font-semibold">{e.player ?? "Un joueur"}</span>
              )}
              <span className="text-pale-mist">{wheelPrizeLabel(e.prize)}</span>
              <span className="ml-auto text-xs tabular-nums text-fog">
                {dateFmt.format(new Date(e.at))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-fog">Aucun tour pour le moment.</p>
      )}
    </section>
  );
}

export function WheelView({
  apiUrl,
  canSpin: initialCanSpin,
  history,
}: {
  apiUrl: string;
  canSpin: boolean;
  history: WheelHistoryResponse | null;
}) {
  const router = useRouter();
  const [canSpin, setCanSpin] = useState(initialCanSpin);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<WheelSpinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const angleRef = useRef(0);
  const [spinMs, setSpinMs] = useState(SPIN_MS);

  const spin = async () => {
    setError(null);
    setResult(null);
    setSpinning(true);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 600 : SPIN_MS;
    setSpinMs(duration);
    const res = await apiCall<WheelSpinResponse>(apiUrl, "/wheel/spin", "POST");
    if (!res.ok) {
      setSpinning(false);
      setError(res.message);
      if (res.code === "already_spun") setCanSpin(false);
      return;
    }
    const won = res.data;
    // le secteur gagnant doit finir sous l'aiguille, avec un petit écart pour que ça ne soit pas pile au centre
    const jitter = (Math.random() - 0.5) * STEP * 0.7;
    const base = Math.ceil(angleRef.current / 360) * 360;
    angleRef.current = base + 360 * 5 + ((360 - won.index * STEP) % 360) + jitter;
    setAngle(angleRef.current);
    sfx.click();
    setTimeout(() => {
      setSpinning(false);
      setCanSpin(false);
      setResult(won);
      const big =
        won.prize.kind === "boost" ||
        (won.prize.kind === "packs" ? won.prize.amount >= 2 : won.prize.amount >= 50);
      sfx.reveal(big ? "SUPER_RARE" : "UNCOMMON");
      router.refresh();
    }, duration + 100);
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-5 sm:mt-6 sm:gap-6">
      <svg
        viewBox="20 40 760 810"
        role="img"
        aria-label="Roue de la fortune"
        className="h-auto w-full max-w-[min(28rem,max(16rem,calc(100dvh-14rem)))] overflow-visible"
      >
        <defs>
          <radialGradient id="wdShine" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
          </radialGradient>
          <linearGradient id="wdRim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd36b" />
            <stop offset="50%" stopColor="#f5b73b" />
            <stop offset="100%" stopColor="#b9781a" />
          </linearGradient>
          <filter id="wdShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="16"
              stdDeviation="16"
              floodColor="#050a28"
              floodOpacity="0.45"
            />
          </filter>
          <filter
            id="wdPinShadow"
            filterUnits="userSpaceOnUse"
            x="300"
            y="20"
            width="200"
            height="220"
          >
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#050a28" floodOpacity="0.4" />
          </filter>
        </defs>

        <g filter="url(#wdShadow)">
          <circle cx={CX} cy={CY} r="368" fill="url(#wdRim)" />
          <circle cx={CX} cy={CY} r="352" fill="#0e1438" />
          <circle cx={CX} cy={CY} r="334" fill="url(#wdRim)" />
        </g>
        {Array.from({ length: 24 }, (_, k) => {
          const [x, y] = point(k * 15, 343);
          return (
            <g key={k}>
              <circle cx={x} cy={y} r="8" fill="#fff7d6" />
              <circle cx={x - 2} cy={y - 2} r="3" fill="#fff" />
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r="324" fill="#fff" />

        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: spinning
              ? `transform ${spinMs / 1000}s cubic-bezier(0.12, 0.7, 0.1, 1)`
              : "none",
          }}
        >
          {WHEEL_PRIZES.map((_, i) => (
            <path key={i} d={sector(i)} fill={COLORS[i % COLORS.length]} />
          ))}
          <circle cx={CX} cy={CY} r={R} fill="url(#wdShine)" />
          {WHEEL_PRIZES.map((_, i) => {
            const [x, y] = point(i * STEP - STEP / 2, R);
            return (
              <line
                key={i}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="#fff"
                strokeOpacity="0.9"
                strokeWidth="4"
              />
            );
          })}
          {WHEEL_PRIZES.map((p, i) => {
            const t = prizeText(p);
            return (
              <g
                key={i}
                transform={`rotate(${i * STEP} ${CX} ${CY})`}
                textAnchor="middle"
                fill="#fff"
              >
                <text
                  x={CX}
                  y={CY - 205}
                  fontSize="62"
                  fontWeight="800"
                  stroke="#0e1438"
                  strokeWidth="8"
                  strokeOpacity="0.55"
                  paintOrder="stroke"
                >
                  {t.big}
                </text>
                <text
                  x={CX}
                  y={CY - 165}
                  fontSize="30"
                  fontWeight="700"
                  stroke="#0e1438"
                  strokeWidth="6"
                  strokeOpacity="0.55"
                  paintOrder="stroke"
                >
                  {t.small}
                </text>
              </g>
            );
          })}
        </g>

        <g filter="url(#wdShadow)">
          <image href="/wikibit.svg" x={CX - 80} y={CY - 80} width="160" height="160" />
        </g>
        <g filter="url(#wdPinShadow)">
          <path
            d="M362 70 Q400 56 438 70 L406 168 Q400 178 394 168 Z"
            fill="url(#wdRim)"
            stroke="#fff"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="400" cy="86" r="11" fill="#0e1438" stroke="#fff" strokeWidth="3" />
        </g>
      </svg>

      <div
        className="flex min-h-24 w-full flex-col items-center gap-3 text-center"
        aria-live="polite"
      >
        {result ? (
          <p className="font-display text-2xl">
            Gagné :{" "}
            {result.prize.kind === "wikibits" ? (
              <Wikibits amount={result.prize.amount} className="text-accent" />
            ) : result.prize.kind === "boost" ? (
              <span className="text-accent">un booster de chance</span>
            ) : (
              <span className="text-accent">
                {result.prize.amount} paquet{result.prize.amount > 1 ? "s" : ""}
              </span>
            )}
          </p>
        ) : spinning ? (
          <p className="text-pale-mist">La roue tourne…</p>
        ) : null}
        {result?.prize.kind === "boost" && (
          <p className="max-w-sm text-sm text-pale-mist">
            Le booster est dans votre stock ({result.dropBoosts}). Activez-le sur la page Paquets
            quand vous voulez : il se cumule et ne s&apos;utilise qu&apos;à votre demande.
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="button"
          className={`${primaryButtonClass} w-full max-w-xs py-3`}
          disabled={!canSpin || spinning}
          onClick={() => void spin()}
        >
          {canSpin ? "Tourner la roue" : "Revenez demain"}
        </button>
        {!canSpin && !spinning && !result && (
          <p className="text-sm text-fog">Vous avez déjà tourné la roue aujourd&apos;hui.</p>
        )}
      </div>

      <details className="w-full max-w-md rounded-xl border border-line bg-surface px-5 py-3">
        <summary className="cursor-pointer text-sm font-semibold">Taux de gain de la roue</summary>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {[...WHEEL_PRIZES]
              .sort((a, b) => b.weight - a.weight)
              .map((p) => (
                <tr key={`${p.kind}-${p.amount}`} className="border-t border-line">
                  <td className="py-1.5">{prizeLabel(p)}</td>
                  <td className="py-1.5 text-right tabular-nums text-fog">
                    {percentFmt.format((p.weight / TOTAL_WEIGHT) * 100)} %
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs leading-relaxed text-fog">
          Un tour gratuit par jour (minuit, heure de Paris). Le booster de chance se garde en stock
          et s&apos;active quand vous ouvrez un paquet : une carte légendaire est alors garantie, et
          elle sort en version mythique {percentFmt.format(BOOST_MYTHIC_RATE * 100)} % du temps au
          lieu de {percentFmt.format(MYTHIC_RATE * 100)} %.
        </p>
      </details>

      {history && (
        <div className="grid w-full gap-6 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
          <HistoryList title="Mes derniers tours" entries={history.mine} />
          <HistoryList title="Derniers gains de la communauté" entries={history.recent} />
        </div>
      )}
    </div>
  );
}
