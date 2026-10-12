"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { StaffOverview, StaffRecentEvent, StaffRole } from "@wikideck/shared";
import {
  AlertTriangle,
  ArrowUpRight,
  Coins,
  Gavel,
  Hourglass,
  Notebook,
  Package,
  PackageOpen,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  UserPlus,
  Users,
  Lock,
} from "@/components/icons";
import type { IconType } from "@/components/icons";
import { Wikibits } from "@/components/wikibit";

export type StaffTab =
  | "overview"
  | "members"
  | "alerts"
  | "reports"
  | "bugs"
  | "auctions"
  | "guilds"
  | "deleted"
  | "audit"
  | "apiKeys"
  | "shop";

// classes complètes (Tailwind ne devine pas les noms construits) : une teinte par carte
const TONES = {
  mauve: { card: "border-tag-mauve/30 bg-tag-mauve/10", icon: "bg-tag-mauve/20 text-tag-mauve", line: "var(--tag-mauve)" },
  blue: { card: "border-tag-blue/30 bg-tag-blue/10", icon: "bg-tag-blue/20 text-tag-blue", line: "var(--tag-blue)" },
  green: { card: "border-tag-green/30 bg-tag-green/10", icon: "bg-tag-green/20 text-tag-green", line: "var(--tag-green)" },
  red: { card: "border-tag-red/30 bg-tag-red/10", icon: "bg-tag-red/20 text-tag-red", line: "var(--tag-red)" },
  peach: { card: "border-tag-peach/30 bg-tag-peach/10", icon: "bg-tag-peach/20 text-tag-peach", line: "var(--tag-peach)" },
  sky: { card: "border-tag-sky/30 bg-tag-sky/10", icon: "bg-tag-sky/20 text-tag-sky", line: "var(--tag-sky)" },
  yellow: { card: "border-tag-yellow/30 bg-tag-yellow/10", icon: "bg-tag-yellow/20 text-tag-yellow", line: "var(--tag-yellow)" },
} as const;
type Tone = keyof typeof TONES;

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 120;
  const h = 36;
  const top = Math.max(...values, 1);
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - ((h - 6) * v) / top).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span className={`text-xs font-bold tabular-nums ${up ? "text-tag-green" : "text-tag-red"}`}>
      {up ? "↗ +" : "↘ "}
      {value} %
    </span>
  );
}

function Kpi({
  icon: Icon,
  tone,
  value,
  label,
  trend,
  badge,
  series,
}: {
  icon: IconType;
  tone: Tone;
  value: string;
  label: string;
  trend?: number | null;
  badge?: string;
  series: number[];
}) {
  const c = TONES[tone];
  return (
    <div className={`rounded-2xl border p-4 ${c.card}`}>
      <div className="flex items-start gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${c.icon}`}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-display text-3xl font-semibold tabular-nums">{value}</div>
            {badge ? (
              <span className="text-xs font-bold tabular-nums text-tag-green">{badge}</span>
            ) : (
              <Trend value={trend ?? null} />
            )}
          </div>
          <div className="text-sm text-pale-mist">{label}</div>
        </div>
      </div>
      <div className="mt-2">
        <Sparkline values={series} color={c.line} />
      </div>
    </div>
  );
}

function Mini({
  icon: Icon,
  tone,
  value,
  label,
  onClick,
}: {
  icon: IconType;
  tone: Tone;
  value: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone].icon}`}>
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className="font-display text-2xl font-semibold tabular-nums">{value}</div>
        <div className="truncate text-sm text-pale-mist">{label}</div>
      </div>
      {onClick && <ArrowUpRight className="size-4 shrink-0 text-fog" />}
    </>
  );
  const cls = "flex items-center gap-3 rounded-2xl border border-line bg-surface p-4";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition-colors hover:border-accent/50`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const EVENT_STYLE: Record<StaffRecentEvent["kind"], { dot: string; badge: string }> = {
  signup: { dot: "bg-tag-mauve", badge: "bg-tag-green/15 text-tag-green" },
  pull: { dot: "bg-tag-yellow", badge: "bg-tag-sky/15 text-tag-sky" },
  report: { dot: "bg-tag-red", badge: "bg-tag-red/15 text-tag-red" },
  bug: { dot: "bg-tag-peach", badge: "bg-tag-peach/15 text-tag-peach" },
  auction: { dot: "bg-tag-peach", badge: "bg-tag-yellow/15 text-tag-yellow" },
  trade: { dot: "bg-tag-teal", badge: "bg-tag-teal/15 text-tag-teal" },
};

const SERIES: { key: keyof StaffOverview["series"]; tone: Tone }[] = [
  { key: "newUsers", tone: "blue" },
  { key: "packs", tone: "green" },
  { key: "battles", tone: "red" },
  { key: "auctions", tone: "peach" },
];

function Chart({ data }: { data: StaffOverview }) {
  const t = useTranslations("staff.overview");
  const format = useFormatter();
  const w = 560;
  const h = 220;
  const pad = { l: 34, r: 10, t: 10, b: 24 };
  const top = Math.max(...SERIES.flatMap((s) => data.series[s.key]), 1);
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(data.days.length - 1, 1);
  const y = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - v / top);
  const ticks = [0, 0.5, 1].map((r) => Math.round(top * r));
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={t("chartTitle")}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 4" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--fog)">
              {v}
            </text>
          </g>
        ))}
        {data.days.map((d, i) => (
          <text key={d} x={x(i)} y={h - 6} textAnchor="middle" fontSize="11" fill="var(--fog)">
            {format.dateTime(new Date(`${d}T12:00:00`), { day: "numeric", month: "short" })}
          </text>
        ))}
        {SERIES.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={TONES[s.tone].line}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={data.series[s.key].map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
          />
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-pale-mist">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: TONES[s.tone].line }} />
            {t(`series.${s.key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StaffOverviewPanel({
  data,
  error,
  name,
  role,
  go,
}: {
  data: StaffOverview | null;
  error: string | null;
  name: string;
  role: StaffRole;
  go: (tab: StaffTab) => void;
}) {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const format = useFormatter();
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-fog">{tc("loading")}</p>;

  const num = (n: number) => format.number(n);
  const eventText = (e: StaffRecentEvent) =>
    t(`overview.recent.${e.kind}`, { name: e.name ?? "", card: e.card ?? "" });
  const quick: { tab: "members" | "reports" | "auctions" | "audit" | "shop" | "apiKeys"; icon: IconType; tone: Tone; admin?: boolean }[] = [
    { tab: "members", icon: Users, tone: "blue" },
    { tab: "reports", icon: Shield, tone: "red" },
    { tab: "auctions", icon: Gavel, tone: "peach" },
    { tab: "audit", icon: Notebook, tone: "mauve" },
    { tab: "shop", icon: ShoppingBag, tone: "green", admin: true },
    { tab: "apiKeys", icon: Lock, tone: "sky", admin: true },
  ];

  return (
    <div className="grid gap-5">
      <div className="relative overflow-hidden rounded-3xl border border-accent/25 bg-linear-to-r from-accent/15 via-tag-mauve/10 to-transparent p-6 sm:p-8">
        <Sparkles className="absolute -right-4 -top-4 size-40 text-accent/10" aria-hidden />
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">
          {t("overview.welcome", { name })} 👋
        </h2>
        <p className="mt-2 max-w-xl text-pale-mist">{t("overview.welcomeText")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Users} tone="mauve" value={num(data.users)} label={t("overview.members")} badge={`+${num(data.newUsers7d)}`} series={data.series.newUsers} />
        <Kpi icon={UserPlus} tone="blue" value={num(data.newUsers7d)} label={t("overview.new7d")} trend={data.trends.newUsers} series={data.series.newUsers} />
        <Kpi icon={Package} tone="green" value={num(data.packsOpened24h)} label={t("overview.packs24h")} trend={data.trends.packs} series={data.series.packs} />
        <Kpi icon={Swords} tone="red" value={num(data.battleGames24h)} label={t("overview.battles24h")} trend={data.trends.battles} series={data.series.battles} />
        <Kpi icon={Gavel} tone="peach" value={num(data.auctionsActive)} label={t("overview.auctions")} trend={data.trends.auctions} series={data.series.auctions} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Mini icon={Hourglass} tone="sky" value={num(data.tradesPending)} label={t("overview.trades")} />
        <Mini icon={AlertTriangle} tone="red" value={num(data.flagged)} label={t("overview.flagged")} onClick={() => go("alerts")} />
        <Mini icon={Shield} tone="blue" value={num(data.banned)} label={t("overview.banned")} onClick={() => go("members")} />
        <Mini icon={Users} tone="mauve" value={num(data.staff)} label={t("overview.staff")} onClick={() => go("members")} />
        <Mini icon={Coins} tone="yellow" value={<Wikibits amount={data.wikibitsTotal} />} label={t("overview.circulation")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr_1.4fr]">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold">
              <PackageOpen className="size-5 text-accent" />
              {t("overview.recentTitle")}
            </h3>
            <button type="button" onClick={() => go("audit")} className="rounded-lg border border-line px-3 py-1 text-xs hover:bg-foreground/10">
              {t("overview.seeAll")}
            </button>
          </div>
          {data.recent.length === 0 ? (
            <p className="mt-4 text-sm text-fog">{t("overview.noActivity")}</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {data.recent.map((e, i) => (
                <li key={`${e.kind}-${e.at}-${i}`} className="flex items-start gap-3 text-sm">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${EVENT_STYLE[e.kind].dot}`} />
                  <div className="min-w-0 flex-1">
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${EVENT_STYLE[e.kind].badge}`}>
                      {t(`overview.kinds.${e.kind}`)}
                    </span>
                    <span className="wrap-break-word">{eventText(e)}</span>
                  </div>
                  <time dateTime={e.at} className="shrink-0 text-xs text-fog">
                    {format.relativeTime(new Date(e.at))}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-bold">{t("overview.quickTitle")}</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {quick
              .filter((q) => !q.admin || role === "ADMIN")
              .map((q) => (
                <button
                  key={q.tab}
                  type="button"
                  onClick={() => go(q.tab)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm font-semibold transition-colors hover:brightness-125 ${TONES[q.tone].card}`}
                >
                  <q.icon className={`size-6 ${TONES[q.tone].icon.split(" ")[1]}`} />
                  {t(`overview.quick.${q.tab}`)}
                </button>
              ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 lg:col-span-2 xl:col-span-1">
          <h3 className="font-bold">{t("overview.chartTitle")}</h3>
          <div className="mt-4">
            <Chart data={data} />
          </div>
        </section>
      </div>
    </div>
  );
}
