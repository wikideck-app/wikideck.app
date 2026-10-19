"use client";

import { showSystemNotification } from "@/lib/web-push";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { PackStatus } from "@wikideck/shared";
import { useSettings } from "@/lib/settings-context";

// recharge à jour : la barre de paquets (rendue côté serveur) est rafraîchie quand un paquet arrive,
// quand on revient sur l'onglet et à intervalle régulier ; la notification n'est qu'un plus, réglable
const STALE_MS = 30_000;

export function PackWatcher({ initial, apiUrl }: { initial: PackStatus | null; apiUrl: string }) {
  const t = useTranslations("notifications.boosterReady");
  const router = useRouter();
  const { settings } = useSettings();
  const enabled = settings.notifications.boosterReady;
  const translate = useRef(t);
  const notify = useRef(enabled);
  useEffect(() => {
    translate.current = t;
    notify.current = enabled;
  });
  const known = useRef(initial?.packs ?? 0);
  const checkedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!initial) return;
    let cancelled = false;
    // plein : rien n'arrive, mais l'état peut changer ailleurs (autre appareil) : on revérifie de temps en temps
    const wait = initial.nextInMs === null ? 5 * 60_000 : initial.nextInMs + 1500;

    const check = async () => {
      clearTimeout(timer.current);
      checkedAt.current = Date.now();
      try {
        const res = await fetch(`${apiUrl}/packs`, { credentials: "include" });
        if (!res.ok || cancelled) return;
        const status = (await res.json()) as PackStatus;
        if (status.packs !== known.current) {
          if (
            status.packs > known.current &&
            notify.current &&
            document.visibilityState === "hidden" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            void showSystemNotification(translate.current("title"), {
              body: translate.current("body"),
              icon: "/icons/icon-192.png",
              tag: "booster-ready",
              data: { url: "/packs" },
            });
          }
          known.current = status.packs;
          // la barre vient du serveur : on la recharge, ce qui relance aussi cet effet avec le nouveau délai
          router.refresh();
          return;
        }
        timer.current = setTimeout(check, status.nextInMs === null ? 5 * 60_000 : status.nextInMs + 1500);
      } catch {
        timer.current = setTimeout(check, 60_000);
      }
    };

    // les minuteurs sont ralentis ou gelés en arrière-plan : au retour sur l'onglet on revérifie
    const wake = () => {
      if (document.visibilityState === "visible" && Date.now() - checkedAt.current > STALE_MS) void check();
    };
    timer.current = setTimeout(check, wait);
    document.addEventListener("visibilitychange", wake);
    addEventListener("focus", wake);
    addEventListener("online", wake);
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", wake);
      removeEventListener("focus", wake);
      removeEventListener("online", wake);
    };
  }, [initial, apiUrl, router]);

  return null;
}
