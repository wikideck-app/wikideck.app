"use client";

import {
  Archive,
  Award,
  BadgeCheck,
  BookOpen,
  Castle,
  Check,
  Coins,
  Copy,
  Crown,
  Diamond,
  Flame,
  Gavel,
  Gem,
  Gift,
  Globe,
  Handshake,
  Landmark,
  Layers,
  Library,
  Medal,
  MessageCircle,
  Package,
  PackageOpen,
  PartyPopper,
  Shield,
  Sparkles,
  Star,
  Swords,
  Tags,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  type IconType,
} from "@/components/icons";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ACHIEVEMENTS,
  type AchievementCategory,
  type AchievementDef,
  type AchievementsResponse,
  type ClaimAchievementsResponse,
} from "@wikideck/shared";
import { Wikibits } from "@/components/wikibit";
import { sfx } from "@/lib/audio";
import { achievementKey } from "@/lib/labels";
import { apiCall } from "@/lib/tags-api";

export const ACHIEVEMENT_ICONS: Record<string, IconType> = {
  archive: Archive,
  award: Award,
  "badge-check": BadgeCheck,
  "book-open": BookOpen,
  castle: Castle,
  coins: Coins,
  copy: Copy,
  crown: Crown,
  diamond: Diamond,
  flame: Flame,
  gavel: Gavel,
  gem: Gem,
  gift: Gift,
  globe: Globe,
  handshake: Handshake,
  landmark: Landmark,
  layers: Layers,
  library: Library,
  medal: Medal,
  "message-circle": MessageCircle,
  package: Package,
  "package-open": PackageOpen,
  "party-popper": PartyPopper,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  swords: Swords,
  tags: Tags,
  trophy: Trophy,
  "user-plus": UserPlus,
  users: Users,
  wallet: Wallet,
};

type Filter = "all" | "done" | "todo";
const FILTERS: Filter[] = ["all", "done", "todo"];
// les catégories du catalogue sont des libellés français : on les range sous un identifiant de traduction
const CATEGORIES = [
  ["Collection", "collection"],
  ["Raretés", "rarities"],
  ["Paquets", "packs"],
  ["Échanges", "trades"],
  ["Marché", "market"],
  ["Communauté", "community"],
] as const satisfies readonly (readonly [AchievementCategory, string])[];

const toastId = () => Date.now() + Math.random();

type Toast = { id: number; title: string; text: React.ReactNode };

export function AchievementsView({ data, apiUrl }: { data: AchievementsResponse; apiUrl: string }) {
  const t = useTranslations("achievements");
  const format = useFormatter();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [claimedKeys, setClaimedKeys] = useState(
    () => new Set(data.achievements.filter((s) => s.claimed).map((s) => s.key)),
  );
  const [busy, setBusy] = useState<string | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const announced = useRef(false);

  const states = new Map(data.achievements.map((s) => [s.key, s]));
  const unlockedKeys = ACHIEVEMENTS.filter((d) => states.get(d.key)?.unlockedAt).map((d) => d.key);
  const pending = ACHIEVEMENTS.filter(
    (d) => states.get(d.key)?.unlockedAt && !claimedKeys.has(d.key),
  );
  const pendingTotal = pending.reduce((sum, d) => sum + d.reward, 0);

  function notify(title: string, text: React.ReactNode) {
    const id = toastId();
    setToasts((prev) => [...prev.slice(-3), { id, title, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
  }

  useEffect(() => {
    const fresh = ACHIEVEMENTS.filter((d) => states.get(d.key)?.isNew);
    if (!fresh.length || announced.current) return;
    announced.current = true;
    notify(
      fresh.length === 1 ? t("toasts.unlockedOne") : t("toasts.unlockedMany", { count: fresh.length }),
      fresh.length === 1
        ? t(`items.${achievementKey(fresh[0].key)}.name`)
        : fresh.map((d) => t(`items.${achievementKey(d.key)}.name`)).join(" · "),
    );
    void apiCall(apiUrl, "/achievements/seen", "POST");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function claim(key?: string) {
    setBusy(key ?? "all");
    setError(null);
    const r = await apiCall<ClaimAchievementsResponse>(
      apiUrl,
      "/achievements/claim",
      "POST",
      key ? { key } : {},
    );
    setBusy(null);
    if (!r.ok) return setError(r.message);
    if (r.data.claimed.length === 0) return;
    setClaimedKeys((prev) => new Set([...prev, ...r.data.claimed.map((c) => c.key)]));
    const total = r.data.claimed.reduce((sum, c) => sum + c.reward, 0);
    const first = ACHIEVEMENTS.find((d) => d.key === r.data.claimed[0].key);
    const amount = () => <Wikibits amount={total} className="font-bold" />;
    sfx.trade();
    notify(
      t("toasts.claimed"),
      r.data.claimed.length === 1
        ? t.rich("toasts.claimedOne", { amount, name: first ? t(`items.${achievementKey(first.key)}.name`) : "" })
        : t.rich("toasts.claimedMany", { amount, count: r.data.claimed.length }),
    );
    router.refresh();
  }

  const percent = Math.round((unlockedKeys.length / data.total) * 100);

  function card(def: AchievementDef) {
    const state = states.get(def.key)!;
    const unlocked = state.unlockedAt !== null;
    const claimed = claimedKeys.has(def.key);
    const done = unlocked && claimed;
    const toClaim = unlocked && !claimed;
    const Icon = ACHIEVEMENT_ICONS[def.icon] ?? Trophy;
    const ratio = Math.min(1, state.progress / def.goal);
    const showBar = !done && def.goal > 1;
    return (
      <li
        key={def.key}
        className={`flex gap-4 rounded-xl border bg-surface p-4 transition-colors ${
          toClaim
            ? "border-accent ring-2 ring-accent"
            : done
              ? "border-accent/40"
              : "border-line opacity-60"
        }`}
      >
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border ${
            unlocked ? "border-accent bg-accent text-accent-foreground" : "border-line text-fog"
          }`}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold">
            <span className="truncate">{t(`items.${achievementKey(def.key)}.name`)}</span>
            {done && <Check className="size-4 shrink-0" strokeWidth={3} aria-label={t("unlocked")} />}
          </p>
          <p className="mt-0.5 text-xs text-pale-mist">{t(`items.${achievementKey(def.key)}.description`)}</p>
          {showBar && (
            <div className="mt-2.5">
              <div className="h-[3px] overflow-hidden rounded-full bg-accent/15">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] tabular-nums text-fog">
                {t("progressOf", { value: Math.min(state.progress, def.goal), goal: def.goal })}
              </p>
            </div>
          )}
          {toClaim ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => claim(def.key)}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground transition-colors hover:bg-(--voltage-violet) hover:text-white disabled:opacity-50"
            >
              {t("claim", { amount: def.reward })}
            </button>
          ) : (
            <p className="mt-2 text-[11px] text-fog">{t("reward", { amount: def.reward })}</p>
          )}
        </div>
      </li>
    );
  }

  return (
    <div>
      <p className="mt-2 text-center text-sm text-fog">
        {t("unlockedCount", { count: unlockedKeys.length, total: data.total })}
      </p>

      <section className="mt-6 rounded-xl border border-line px-5 py-4 bg-surface">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-bold uppercase tracking-[0.2em] text-fog">{t("progress")}</span>
          <span className="font-bold tabular-nums">{format.number(percent / 100, "percent")}</span>
        </div>
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-accent/15">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      </section>

      {pending.length > 0 && (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent bg-accent/6 px-5 py-4">
          <p className="text-sm">
            <strong>
              {t("pendingTitle", { count: pending.length })}
            </strong>
            <span className="ml-2 text-pale-mist">
              {t.rich("pendingTotal", {
                amount: () => <Wikibits amount={pendingTotal} className="font-bold text-foreground" />,
              })}
            </span>
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => claim()}
            className="rounded-full border border-accent bg-accent px-5 py-2 text-sm font-bold text-accent-foreground transition-colors hover:bg-(--voltage-violet) hover:text-white disabled:opacity-50"
          >
            {busy === "all" ? "…" : t("claimAll")}
          </button>
        </section>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div role="tablist" className="mt-6 flex gap-2 border-b border-line">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              filter === f
                ? "border-accent text-foreground"
                : "border-transparent text-fog hover:text-foreground"
            }`}
          >
            {t(`filters.${f}`)}
          </button>
        ))}
      </div>

      {CATEGORIES.map(([category, categoryKey]) => {
        const defs = ACHIEVEMENTS.filter((d) => d.category === category);
        const done = defs.filter((d) => states.get(d.key)?.unlockedAt).length;
        const shown = defs.filter((d) => {
          const unlocked = !!states.get(d.key)?.unlockedAt;
          return filter === "all" || (filter === "done" ? unlocked : !unlocked);
        });
        if (!shown.length) return null;
        return (
          <section key={category} className="mt-8">
            <h2 className="flex items-baseline gap-3 text-xs font-bold uppercase tracking-[0.2em] text-fog">
              {t(`categories.${categoryKey}`)}
              <span className="font-medium tabular-nums">
                {done} / {defs.length}
              </span>
            </h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{shown.map(card)}</ul>
          </section>
        );
      })}

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-60 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="toast-in pointer-events-auto rounded-xl border border-accent/40 bg-surface px-4 py-3 text-sm"
          >
            <p className="font-bold">{toast.title}</p>
            <p className="mt-0.5 text-pale-mist">{toast.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
