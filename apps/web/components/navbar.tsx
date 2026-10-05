"use client";

import { ChevronDown, LogOut, Menu, Settings, ShieldCheck, X } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PackStatus, SessionUser } from "@wikideck/shared";
import { Wikibits } from "@/components/wikibit";
import { NAV, NAV_GROUPS, type NavGroup, type NavItem } from "@/lib/nav";

type Props = {
  user: SessionUser;
  logoutUrl: string;
  packs: Pick<PackStatus, "packs" | "max"> | null;
};

const chip =
  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 border-white/40 px-3.5 py-1.5 text-sm font-bold transition-colors hover:border-white";

const iconButton =
  "flex size-10 items-center justify-center rounded-full border-2 border-white/40 transition-colors hover:border-white hover:bg-white hover:text-[var(--deep-concord)]";

function PackChip({ packs }: { packs: NonNullable<Props["packs"]> }) {
  const ratio = Math.min(1, packs.packs / packs.max);
  return (
    <Link href="/packs" className={chip} title="Paquets disponibles">
      <span className="hidden text-[11px] uppercase tracking-[0.12em] text-pale-mist 2xl:inline">
        Paquets
      </span>
      <span className="tabular-nums">
        {packs.packs}
        <span className="font-medium text-fog"> / {packs.max}</span>
      </span>
      <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-white/25 2xl:block">
        <span
          className="block h-full rounded-full bg-white transition-[width] duration-700"
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </Link>
  );
}

const MENU_GROUPS = NAV_GROUPS.filter((g) => g !== "Compte");

type OpenMenu = NavGroup | "all" | null;

export function Navbar({ user, logoutUrl, packs }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState<OpenMenu>(null);
  const bar = useRef<HTMLDivElement>(null);
  const badges: Record<string, number> = {
    trades: user.pendingTrades,
    friends: user.pendingFriends,
    messages: user.unreadMessages,
    achievements: user.claimableAchievements,
  };
  const current = NAV.find(
    (item) => pathname === `/${item.slug}` || pathname.startsWith(`/${item.slug}/`),
  );
  const items = (group: NavGroup) => NAV.filter((item) => item.group === group);
  const pendingIn = (group: NavGroup) =>
    items(group).reduce((sum, item) => sum + (badges[item.slug] ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      bar.current?.querySelector<HTMLElement>("[aria-expanded=true]")?.focus();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  const link = ({ slug, label, icon: Icon }: NavItem) => {
    const active = current?.slug === slug;
    const count = badges[slug] ?? 0;
    return (
      <li key={slug}>
        <Link
          href={`/${slug}`}
          onClick={() => setOpen(null)}
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-3 rounded-[15px] px-4 py-3 text-sm font-bold transition-colors ${
            active
              ? "bg-accent text-accent-foreground"
              : "bg-[var(--theme-pill)] text-[var(--theme-pill-ink)] hover:bg-[var(--theme-pill-hover)]"
          }`}
        >
          <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.9} />
          {label}
          {count > 0 && (
            <span
              title={`${count} en attente`}
              className="ml-auto min-w-5 rounded-full bg-[var(--bubblegum)] px-1.5 text-center text-[11px] font-bold leading-5 text-white"
            >
              {count}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const groupButton = (group: NavGroup) => {
    const expanded = open === group;
    const here = current?.group === group;
    const pending = pendingIn(group);
    return (
      <div key={group} className="relative hidden xl:block">
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={expanded}
          aria-controls={`menu-${group}`}
          onClick={() => setOpen(expanded ? null : group)}
          className={`relative flex h-10 items-center gap-2 rounded-full border-2 px-3.5 text-sm font-bold transition-colors ${
            expanded
              ? "border-white bg-white text-[var(--deep-concord)]"
              : here
                ? "border-white/80 bg-white/15"
                : "border-white/40 hover:border-white"
          }`}
        >
          {expanded ? <X className="size-4" /> : <Menu className="size-4" />}
          {group}
          <ChevronDown
            className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          {!expanded && pending > 0 && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[var(--theme-bar-solid)] bg-[var(--bubblegum)]"
            />
          )}
        </button>
        {expanded && (
          <nav
            id={`menu-${group}`}
            aria-label={group}
            className="on-light toast-in absolute left-0 top-[calc(100%+10px)] z-10 w-64 rounded-[25px] bg-surface p-4 shadow-[var(--shadow-float)]"
          >
            <ul className="flex flex-col gap-1.5">{items(group).map(link)}</ul>
          </nav>
        )}
      </div>
    );
  };

  const allPending = MENU_GROUPS.reduce((sum, g) => sum + pendingIn(g), 0);

  return (
    <header ref={bar} className="on-grape grape-field sticky top-0 z-40">
      <div className="mx-auto grid h-16 w-full max-w-[1600px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/packs" aria-label="Wikideck" className="group flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt=""
              width={96}
              height={96}
              priority
              className="size-10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
            />
            <span className="hidden text-xl font-bold tracking-tight min-[420px]:inline">
              Wikideck
            </span>
          </Link>

          <button
            type="button"
            aria-label={open === "all" ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open === "all"}
            aria-controls="menu-all"
            onClick={() => setOpen(open === "all" ? null : "all")}
            className={`relative flex size-10 items-center justify-center rounded-full border-2 transition-colors xl:hidden ${
              open === "all"
                ? "border-white bg-white text-[var(--deep-concord)]"
                : "border-white/40 hover:border-white"
            }`}
          >
            {open === "all" ? <X className="size-5" /> : <Menu className="size-5" />}
            {open !== "all" && allPending > 0 && (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[var(--theme-bar-solid)] bg-[var(--bubblegum)]"
              />
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2">{MENU_GROUPS.map(groupButton)}</div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {packs && <PackChip packs={packs} />}
          <Link href="/market" className={chip} title="Solde de wikibits">
            <Wikibits amount={user.wikibits} />
          </Link>
          <Link
            href="/profile"
            title="Mon profil"
            className="hidden items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-white/10 md:flex 2xl:pr-3"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="size-9 rounded-full ring-2 ring-white/40"
              />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-white/40 text-sm font-bold">
                {user.username.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="hidden max-w-32 truncate text-sm font-bold 2xl:inline">
              {user.username}
            </span>
          </Link>
          {user.staff && (
            <Link
              href="/staff"
              aria-label={
                user.staffAlerts ? `Espace staff : ${user.staffAlerts} à traiter` : "Espace staff"
              }
              title="Espace staff"
              className={`${iconButton} relative`}
            >
              <ShieldCheck className="size-4" />
              {user.staffAlerts > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--bubblegum)] px-1 text-[10px] font-bold leading-none text-white">
                  {user.staffAlerts > 99 ? "99+" : user.staffAlerts}
                </span>
              )}
            </Link>
          )}
          <Link href="/settings" aria-label="Paramètres" title="Paramètres" className={iconButton}>
            <Settings className="size-4" />
          </Link>
          <form action={logoutUrl} method="post">
            <button
              type="submit"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className={iconButton}
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {open && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Fermer le menu"
          onClick={() => setOpen(null)}
          className="fixed inset-0 top-16 -z-10 cursor-default bg-[var(--theme-scrim)]"
        />
      )}

      {open === "all" && (
        <nav
          id="menu-all"
          aria-label="Navigation principale"
          className="on-light toast-in absolute left-3 right-3 top-[68px] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-[25px] bg-surface p-5 shadow-[var(--shadow-float)] xl:hidden"
        >
          <div className="flex flex-col gap-5">
            {MENU_GROUPS.map((group) => (
              <section key={group}>
                <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fog">
                  {group}
                </h2>
                <ul className="mt-2.5 flex flex-col gap-1.5">{items(group).map(link)}</ul>
              </section>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
