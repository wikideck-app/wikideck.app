import type { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const snapshot = () => Math.floor(Date.now() / 1000) * 1000;

export const useNow = () => useSyncExternalStore(subscribe, snapshot, () => 0);

export function formatRemaining(ms: number, t: ReturnType<typeof useTranslations<"common.duration">>) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return t("days", { days: d, hours: h });
  if (h > 0) return t("hours", { hours: h, minutes: pad(m) });
  if (m > 0) return t("minutes", { minutes: m, seconds: pad(s % 60) });
  return t("seconds", { seconds: s % 60 });
}
