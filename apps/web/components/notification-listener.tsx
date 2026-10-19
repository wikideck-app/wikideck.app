"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LiveEvent, LiveNotify } from "@wikideck/shared";
import { emitLive, setPushConnected } from "@/lib/push";

const TYPES = [
  "message",
  "friend",
  "trade",
  "outbid",
  "auction",
  "wishlist",
  "gift",
  "achievement",
  "staff",
];

type Toast = { id: number; text: string; href: string };

type ToastTranslator = ReturnType<typeof useTranslations<"notifications.toasts">>;

function describe(event: LiveEvent, t: ToastTranslator): { text: string; href: string } {
  const from =
    "from" in event
      ? String(event.from)
          .replace(/[\u0000-\u001f]/g, "")
          .slice(0, 40)
      : "";
  switch (event.type) {
    case "message":
      return { text: t("message", { from }), href: "/messages" };
    case "friend":
      return {
        text: t(event.accepted ? "friendAccepted" : "friendRequest", { from }),
        href: "/friends",
      };
    case "trade":
      return { text: t("trade", { from }), href: "/trades" };
    case "outbid":
      return {
        text: t("outbid"),
        href: `/market/${encodeURIComponent(event.auction)}`,
      };
    case "auction":
      return {
        text: t("auction"),
        href: `/market/${encodeURIComponent(event.auction)}`,
      };
    case "wishlist":
      return {
        text: t("wishlist", {
          card: String(event.card)
            .replace(/[\u0000-\u001f]/g, "")
            .slice(0, 80),
        }),
        href: `/market/${encodeURIComponent(event.auction)}`,
      };
    case "gift":
      return { text: t("gift", { from }), href: "/guild" };
    case "achievement":
      return { text: t("achievement"), href: "/achievements" };
    case "staff":
      if (event.kind === "bug") return { text: t("staffBug"), href: "/staff" };
      return event.kind === "report"
        ? { text: t("staffReport"), href: "/staff" }
        : { text: t("staffSuspect"), href: "/staff" };
  }
}

export function NotificationListener({
  live,
  dailyBonus = 0,
}: {
  live: LiveNotify | null;
  dailyBonus?: number;
}) {
  const t = useTranslations("notifications.toasts");
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  // le bonus n'est versé qu'une fois par jour : l'annonce ne s'affiche qu'une fois, à ce chargement
  // (le garde évite le doublon quand l'effet se relance : mode strict, rafraîchissement des messages)
  const bonusAnnounced = useRef(false);
  const translate = useRef(t);
  useEffect(() => {
    translate.current = t;
  });
  useEffect(() => {
    if (!dailyBonus || bonusAnnounced.current) return;
    bonusAnnounced.current = true;
    const id = Date.now() + Math.random();
    setToasts((prev) => [
      ...prev,
      { id, text: translate.current("dailyBonus", { amount: dailyBonus }), href: path.current },
    ]);
    // pas de nettoyage : le garde empêche toute relance, le toast doit disparaître seul
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 7000);
  }, [dailyBonus]);

  useEffect(() => {
    if (!live || typeof EventSource === "undefined") return;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let stopped = false;
    // dernier instant (secondes) où le flux était sûrement à jour : à la reconnexion on rattrape ce qui a été manqué
    let lastSeen = Math.floor(Date.now() / 1000);
    const seen = new Set<string>();

    const handle = (e: Event) => {
      let event: LiveEvent;
      try {
        const packet = JSON.parse((e as MessageEvent<string>).data) as {
          id?: string;
          time?: number;
          message: string;
        };
        if (packet.id) {
          if (seen.has(packet.id)) return;
          seen.add(packet.id);
          if (seen.size > 200) seen.delete(seen.values().next().value as string);
        }
        if (packet.time) lastSeen = Math.max(lastSeen, packet.time);
        event = JSON.parse(packet.message) as LiveEvent;
      } catch {
        return;
      }
      if (!event || !TYPES.includes(event.type)) return;

      emitLive(event);
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 400);

      if (event.type === "message" && path.current.startsWith("/messages")) return;
      const { text, href } = describe(event, translate.current);
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-2), { id, text, href }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 7000);
    };

    const connect = () => {
      if (stopped) return;
      source?.close();
      clearTimeout(retry);
      source = new EventSource(`${live.url}/${live.topic}/sse?since=${lastSeen}`);
      source.onopen = () => {
        failures = 0;
        setPushConnected(true);
      };
      // le navigateur ne relance pas toujours seul (réponse refusée, réseau coupé, veille) : on s'en charge
      source.onerror = () => {
        setPushConnected(false);
        source?.close();
        lastSeen = Math.max(lastSeen - 2, 0);
        retry = setTimeout(connect, Math.min(30_000, 1000 * 2 ** failures++));
      };
      source.addEventListener("message", handle);
    };

    // retour sur l'onglet ou réseau revenu : on vérifie tout de suite que le flux est vivant
    const wake = () => {
      if (document.visibilityState === "visible" && source?.readyState !== EventSource.OPEN) {
        failures = 0;
        connect();
      }
    };
    connect();
    document.addEventListener("visibilitychange", wake);
    addEventListener("online", wake);
    return () => {
      stopped = true;
      source?.close();
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", wake);
      removeEventListener("online", wake);
      setPushConnected(false);
      clearTimeout(refreshTimer.current);
    };
  }, [live, router]);

  if (!toasts.length) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-70 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <Link
          key={toast.id}
          href={toast.href}
          role="status"
          onClick={() => setToasts((all) => all.filter((x) => x.id !== toast.id))}
          className="toast-in pointer-events-auto rounded-xl border border-accent/40 bg-surface px-4 py-3 text-sm transition-colors hover:border-accent"
        >
          {toast.text}
        </Link>
      ))}
    </div>
  );
}
