"use client";

import { useState } from "react";
import { RARITIES, type MarketSale } from "@wikideck/shared";

const W = 640;
const H = 240;
const PAD = { l: 42, r: 14, t: 16, b: 28 };
const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });
const fullFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" });

function niceTop(max: number) {
  const padded = Math.max(max * 1.1, 4);
  const step = padded > 200 ? 20 : padded > 50 ? 10 : padded > 20 ? 5 : 1;
  return Math.ceil(padded / step) * step;
}

export function PriceChart({ points, average }: { points: MarketSale[]; average: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-fog">Aucune vente pour l&apos;instant.</p>;
  }

  const times = points.map((p) => new Date(p.at).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const top = niceTop(Math.max(...points.map((p) => p.price)));
  const innerW = W - PAD.l - PAD.r;
  const x = (t: number) => PAD.l + (t1 === t0 ? innerW / 2 : ((t - t0) / (t1 - t0)) * innerW);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const coords = points.map((p, i) => [x(times[i]), y(p.price)] as const);
  const line = coords.map(([cx, cy], i) => `${i ? "L" : "M"}${cx},${cy}`).join(" ");
  const area = `${line} L${coords.at(-1)![0]},${H - PAD.b} L${coords[0][0]},${H - PAD.b} Z`;

  const yTicks = [0, 1 / 3, 2 / 3, 1].map((r) => Math.round(top * r));
  const xTicks = (t1 === t0 ? [0] : [0, 0.25, 0.5, 0.75, 1])
    .map((r) => t0 + (t1 - t0) * r)
    .filter((t, i, all) => i === 0 || dayFmt.format(t) !== dayFmt.format(all[i - 1]));

  const active = hover === null ? null : points[hover];
  const activeRarity = active && RARITIES.find((r) => r.value === active.rarity);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Évolution des prix de vente"
        className="w-full"
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * W;
          let best = 0;
          coords.forEach(([cx], i) => {
            if (Math.abs(cx - px) < Math.abs(coords[best][0] - px)) best = i;
          });
          setHover(best);
        }}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(v)}
              y2={y(v)}
              stroke="currentColor"
              opacity={0.1}
            />
            <text x={PAD.l - 8} y={y(v) + 3.5} textAnchor="end" className="fill-fog text-[10px]">
              {v}
            </text>
          </g>
        ))}
        {average !== null && (
          <g>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(average)}
              y2={y(average)}
              stroke="currentColor"
              strokeDasharray="4 4"
              opacity={0.4}
            />
            <text
              x={PAD.l + 6}
              y={y(average) - 5}
              textAnchor="start"
              className="fill-pale-mist text-[10px]"
            >
              Moy. {average}
            </text>
          </g>
        )}
        <path d={area} fill="currentColor" opacity={0.08} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
        {coords.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={hover === i ? 5 : 2.5} fill="currentColor" />
        ))}
        {hover !== null && (
          <line
            x1={coords[hover][0]}
            x2={coords[hover][0]}
            y1={PAD.t}
            y2={H - PAD.b}
            stroke="currentColor"
            opacity={0.25}
            strokeDasharray="3 3"
          />
        )}
        {xTicks.map((t, i) => (
          <text
            key={t}
            x={Math.min(Math.max(x(t), PAD.l + 14), W - PAD.r - 14)}
            y={H - 8}
            textAnchor={xTicks.length === 1 ? "middle" : i === 0 ? "start" : "middle"}
            className="fill-fog text-[10px]"
          >
            {dayFmt.format(t)}
          </text>
        ))}
      </svg>
      {active && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs"
          style={{ left: `${Math.min(80, Math.max(20, (coords[hover][0] / W) * 100))}%` }}
        >
          <p className="text-pale-mist">{fullFmt.format(new Date(active.at))}</p>
          <p className="mt-1.5 flex items-center justify-between gap-4">
            <span className="rounded border border-line px-1.5 py-px text-[10px] font-bold uppercase">
              {activeRarity?.label}
            </span>
            <span className="font-bold tabular-nums">{active.price} wikibits</span>
          </p>
        </div>
      )}
    </div>
  );
}
