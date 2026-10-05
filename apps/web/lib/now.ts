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

export function formatRemaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${pad(m)}`;
  if (m > 0) return `${m} min ${pad(s % 60)} s`;
  return `${s % 60} s`;
}
