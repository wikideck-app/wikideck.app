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

  // le bonus n'est versé qu'une fois par jour : l'annonce ne s'affiche qu'à ce chargement
  useEffect(() => {
    if (!dailyBonus) return;
    const id = Date.now() + Math.random();
    setToasts((prev) => [
      ...prev,
      { id, text: t("dailyBonus", { amount: dailyBonus }), href: path.current },
    ]);
    const timer = setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 7000);
    return () => clearTimeout(timer);
  }, [dailyBonus, t]);

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
      const { text, href } = describe(event, t);
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-2), { id, text, href }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 7000);
    });
    return () => {
      source.close();
      setPushConnected(false);
      clearTimeout(refreshTimer.current);
    };
  }, [live, router, t]);

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
