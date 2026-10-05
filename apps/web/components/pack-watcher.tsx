"use client";

import { useEffect, useRef } from "react";
import type { PackStatus } from "@wikideck/shared";
import { useSettings } from "@/lib/settings-context";

export function PackWatcher({ initial, apiUrl }: { initial: PackStatus | null; apiUrl: string }) {
  const { settings } = useSettings();
  const enabled = settings.notifications.boosterReady;
  const known = useRef(initial?.packs ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!enabled || !initial || initial.nextInMs === null) return;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${apiUrl}/packs`, { credentials: "include" });
        if (!res.ok || cancelled) return;
        const status = (await res.json()) as PackStatus;
        if (status.packs > known.current && document.visibilityState === "hidden") {
          if ("Notification" in window && Notification.permission === "granted") {
            const n = new Notification("Wikideck", {
              body: "Votre booster est prêt : un nouveau paquet vous attend !",
              icon: "/logo.webp",
              tag: "booster-ready",
            });
            n.onclick = () => {
              window.focus();
              window.location.assign("/packs");
            };
          }
        }
        known.current = status.packs;
        if (status.nextInMs !== null) timer.current = setTimeout(check, status.nextInMs + 1500);
      } catch {
        timer.current = setTimeout(check, 60_000);
      }
    };

    timer.current = setTimeout(check, initial.nextInMs + 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [enabled, initial, apiUrl]);

  return null;
}
