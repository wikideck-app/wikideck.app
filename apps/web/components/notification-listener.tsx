"use client";

import Link from "next/link";
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

function describe(event: LiveEvent): { text: string; href: string } {
  const from =
    "from" in event
      ? String(event.from)
          .replace(/[\u0000-\u001f]/g, "")
          .slice(0, 40)
      : "";
  switch (event.type) {
    case "message":
      return { text: `Nouveau message de ${from}`, href: "/messages" };
    case "friend":
      return {
        text: event.accepted
          ? `${from} a accepté votre demande d'ami`
          : `${from} vous a envoyé une demande d'ami`,
        href: "/friends",
      };
    case "trade":
      return { text: `Échange mis à jour avec ${from}`, href: "/trades" };
    case "outbid":
      return {
        text: "Vous avez été surenchéri",
        href: `/market/${encodeURIComponent(event.auction)}`,
      };
    case "auction":
      return {
        text: "Une de vos enchères a évolué",
        href: `/market/${encodeURIComponent(event.auction)}`,
      };
    case "wishlist":
      return {
        text: `${String(event.card)
          .replace(/[\u0000-\u001f]/g, "")
          .slice(0, 80)} (votre liste d'envies) est en vente`,
        href: `/market/${encodeURIComponent(event.auction)}`,
      };
    case "gift":
      return { text: `${from} vous a offert une carte`, href: "/guild" };
    case "achievement":
      return { text: "Nouveau succès débloqué", href: "/achievements" };
    case "staff":
      if (event.kind === "bug") return { text: "Nouveau rapport de bug à traiter", href: "/staff" };
      return event.kind === "report"
        ? { text: "Nouveau signalement de message à traiter", href: "/staff" }
        : { text: "Un compte vient d'être signalé comme suspect", href: "/staff" };
  }
}

export function NotificationListener({
  live,
  dailyBonus = 0,
}: {
  live: LiveNotify | null;
  dailyBonus?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  // le bonus n'est versé qu'une fois par jour : l'annonce ne s'affiche qu'à ce chargement
  useEffect(() => {
    if (!dailyBonus) return;
    const id = Date.now() + Math.random();
    setToasts((t) => [
      ...t,
      { id, text: `Bonus du jour : +${dailyBonus} wikibits`, href: path.current },
    ]);
    const timer = setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);
    return () => clearTimeout(timer);
  }, [dailyBonus]);

  useEffect(() => {
    if (!live || typeof EventSource === "undefined") return;
    const source = new EventSource(`${live.url}/${live.topic}/sse`);
    source.onopen = () => setPushConnected(true);
    source.onerror = () => setPushConnected(false);
    source.addEventListener("message", (e) => {
      let event: LiveEvent;
      try {
        event = JSON.parse(JSON.parse((e as MessageEvent<string>).data).message) as LiveEvent;
      } catch {
        return;
      }
      if (!event || !TYPES.includes(event.type)) return;

      emitLive(event);
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 400);

      if (event.type === "message" && path.current.startsWith("/messages")) return;
      const { text, href } = describe(event);
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, text, href }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);
    });
    return () => {
      source.close();
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
      {toasts.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          role="status"
          onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
          className="toast-in pointer-events-auto rounded-xl border border-accent/40 bg-surface px-4 py-3 text-sm transition-colors hover:border-accent"
        >
          {t.text}
        </Link>
      ))}
    </div>
  );
}
