"use client";

import { ArrowUpRight, ChevronDown, DiscordLogo, LogOut, Menu, Settings, ShieldCheck, User, X } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PackStatus, SessionUser } from "@wikideck/shared";
import { Wikibits } from "@/components/wikibit";
import { DISCORD_URL } from "@/lib/site";
import { NAV, NAV_GROUPS, type NavGroup, type NavItem } from "@/lib/nav";

type Props = {
  user: SessionUser;
  logoutUrl: string;
  packs: (Pick<PackStatus, "packs" | "max"> & { anime?: Pick<PackStatus, "packs" | "max"> }) | null;
};

const chip =
  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 border-white/40 px-3 py-1.5 text-sm font-bold sm:px-3.5 transition-colors hover:border-white";

function PackCount({
  label,
  title,
  packs,
}: {
  label: string;
  title: string;
  packs: { packs: number; max: number };
}) {
  return (
    <span title={title} className="flex items-baseline gap-1">
      <span aria-hidden className="text-[10px] font-extrabold uppercase text-pale-mist">
        {label}
      </span>
      <span className="tabular-nums">
        {packs.packs}
        <span className="hidden font-medium text-fog sm:inline"> / {packs.max}</span>
      </span>
    </span>
  );
}

// deux réserves : paquets Wikipédia et paquets anime / manga
function PackChip({ packs }: { packs: NonNullable<Props["packs"]> }) {
  const t = useTranslations("nav");
  const wiki = t("packsWikipedia");
  const anime = t("packsAnime");
  return (
    <Link
      href="/packs"
      className={chip}
      title={t("packsAvailable")}
      aria-label={`${t("packsAvailable")} : ${wiki} ${packs.packs}/${packs.max}${
        packs.anime ? `, ${anime} ${packs.anime.packs}/${packs.anime.max}` : ""
      }`}
    >
      <span className="hidden text-[11px] uppercase tracking-[0.12em] text-pale-mist 2xl:inline">
        {t("packsShort")}
      </span>
      <PackCount label={t("packsWikipediaShort")} title={wiki} packs={packs} />
      {packs.anime && (
        <>
          <span aria-hidden className="h-4 w-px bg-white/30" />
          <PackCount label={t("packsAnimeShort")} title={anime} packs={packs.anime} />
        </>
      )}
    </Link>
  );
}

const menuLink =
  "flex items-center gap-3 rounded-[15px] bg-(--theme-pill) px-4 py-3 text-sm font-bold text-(--theme-pill-ink) transition-colors hover:bg-(--theme-pill-hover)";

const MENU_GROUPS = NAV_GROUPS.filter((g) => g !== "account");

type OpenMenu = NavGroup | "all" | "account" | null;

export function Navbar({ user, logoutUrl, packs }: Props) {
  const t = useTranslations("nav");
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

  const link = ({ slug, icon: Icon }: NavItem) => {
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
              : "bg-(--theme-pill) text-(--theme-pill-ink) hover:bg-(--theme-pill-hover)"
          }`}
        >
          <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.9} />
          {t(`items.${slug}`)}
          {count > 0 && (
            <span
              title={t("pending", { count })}
              className="ml-auto min-w-5 rounded-full bg-(--bubblegum) px-1.5 text-center text-[11px] font-bold leading-5 text-white"
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
              ? "border-white bg-white text-(--deep-concord)"
              : here
                ? "border-white/80 bg-white/15"
                : "border-white/40 hover:border-white"
          }`}
        >
          {expanded ? <X className="size-4" /> : <Menu className="size-4" />}
          {t(`groups.${group}`)}
          <ChevronDown
            className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          {!expanded && pending > 0 && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-(--theme-bar-solid) bg-(--bubblegum)"
            />
          )}
        </button>
        {expanded && (
          <nav
            id={`menu-${group}`}
            aria-label={t(`groups.${group}`)}
            className="on-light toast-in absolute left-0 top-[calc(100%+10px)] z-10 w-64 rounded-xl bg-surface p-4 shadow-(--shadow-float)"
          >
            <ul className="flex flex-col gap-1.5">{items(group).map(link)}</ul>
          </nav>
        )}
      </div>
    );
  };

  const discordLink = (visibility: string) => (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noreferrer"
      className={`${visibility} items-center gap-2 whitespace-nowrap rounded-full bg-[#5865f2] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-[#4752c4] 2xl:px-5 2xl:text-sm`}
    >
      <DiscordLogo className="size-5" />
      {t("joinDiscord")}
      <ArrowUpRight className="size-4" />
    </a>
  );

  const allPending = MENU_GROUPS.reduce((sum, g) => sum + pendingIn(g), 0);

  return (
    <header ref={bar} className="on-grape grape-field sticky top-0 z-40">
      <div className="mx-auto grid h-16 w-full max-w-[1600px] grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 sm:px-6 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex items-center gap-3">
          <Link href="/packs" aria-label={t("brand")} className="group flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt=""
              width={96}
              height={96}
              priority
              className="size-10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
            />
            <span className="hidden text-xl font-bold tracking-tight min-[420px]:inline">
              {t("brand")}
            </span>
          </Link>

          <button
            type="button"
            aria-label={open === "all" ? t("closeMenu") : t("openMenu")}
            aria-expanded={open === "all"}
            aria-controls="menu-all"
            onClick={() => setOpen(open === "all" ? null : "all")}
            className={`relative flex aspect-square size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors xl:hidden ${
              open === "all"
                ? "border-white bg-white text-(--deep-concord)"
                : "border-white/40 hover:border-white"
            }`}
          >
            {open === "all" ? <X className="size-5" /> : <Menu className="size-5" />}
            {open !== "all" && allPending > 0 && (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-(--theme-bar-solid) bg-(--bubblegum)"
              />
            )}
          </button>

          {/* centré dans l'espace entre le logo et le premier menu (les menus restent centrés sur la page) */}
          <div className="hidden min-w-0 flex-1 justify-center xl:flex">
            {discordLink("inline-flex")}
          </div>
        </div>

        <div className="hidden items-center justify-center gap-2 xl:flex">{MENU_GROUPS.map(groupButton)}</div>

        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
          {packs && <PackChip packs={packs} />}
          <Link href="/market" className={chip} title={t("wikibitsBalance")}>
            <Wikibits amount={user.wikibits} />
          </Link>
          <div className="relative hidden md:block">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={open === "account"}
              aria-controls="menu-account"
              aria-label={t("accountMenu")}
              onClick={() => setOpen(open === "account" ? null : "account")}
              className={`relative flex items-center gap-2.5 rounded-full p-1 pr-2.5 transition-colors hover:bg-white/10 ${
                open === "account" ? "bg-white/15" : ""
              }`}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="size-9 shrink-0 rounded-full ring-2 ring-white/40"
                />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white/40 text-sm font-bold">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-32 truncate text-sm font-bold 2xl:inline">
                {user.username}
              </span>
              <ChevronDown
                className={`size-3.5 transition-transform ${open === "account" ? "rotate-180" : ""}`}
              />
              {open !== "account" && user.staff && user.staffAlerts > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-(--theme-bar-solid) bg-(--bubblegum)"
                />
              )}
            </button>
            {open === "account" && (
              <nav
                id="menu-account"
                aria-label={t("accountMenu")}
                className="on-light toast-in absolute right-0 top-[calc(100%+10px)] z-10 w-64 rounded-xl bg-surface p-4 shadow-(--shadow-float)"
              >
                <p className="truncate px-1 pb-3 text-sm font-bold">{user.username}</p>
                <ul className="flex flex-col gap-1.5">
                  <li>
                    <Link href="/profile" onClick={() => setOpen(null)} className={menuLink}>
                      <User className="size-[18px]" />
                      {t("myProfile")}
                    </Link>
                  </li>
                  {user.staff && (
                    <li>
                      <Link href="/staff" onClick={() => setOpen(null)} className={menuLink}>
                        <ShieldCheck className="size-[18px]" />
                        {t("staff")}
                        {user.staffAlerts > 0 && (
                          <span className="ml-auto min-w-5 rounded-full bg-(--bubblegum) px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                            {user.staffAlerts}
                          </span>
                        )}
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link href="/settings" onClick={() => setOpen(null)} className={menuLink}>
                      <Settings className="size-[18px]" />
                      {t("settings")}
                    </Link>
                  </li>
                  <li>
                    <form action={logoutUrl} method="post">
                      <button type="submit" className={`${menuLink} w-full`}>
                        <LogOut className="size-[18px]" />
                        {t("logout")}
                      </button>
                    </form>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>
      </div>

      {open && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t("closeMenu")}
          onClick={() => setOpen(null)}
          className="fixed inset-0 top-16 -z-10 cursor-default bg-(--theme-scrim)"
        />
      )}

      {open === "all" && (
        <nav
          id="menu-all"
          aria-label={t("mainNavigation")}
          className="on-light toast-in absolute left-3 right-3 top-[68px] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl bg-surface p-5 shadow-(--shadow-float) xl:hidden"
        >
          <div className="flex flex-col gap-5">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-full bg-[#5865f2] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white"
            >
              <DiscordLogo className="size-5" />
              {t("joinDiscord")}
              <ArrowUpRight className="size-4" />
            </a>
            {MENU_GROUPS.map((group) => (
              <section key={group}>
                <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fog">
                  {t(`groups.${group}`)}
                </h2>
                <ul className="mt-2.5 flex flex-col gap-1.5">{items(group).map(link)}</ul>
              </section>
            ))}
            {/* sous 768 px les boutons du compte quittent la barre : ils sont ici */}
            <section className="md:hidden">
              <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fog">
                {t("groups.account")}
              </h2>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {items("account").map(link)}
                {user.staff && (
                  <li>
                    <Link href="/staff" onClick={() => setOpen(null)} className={menuLink}>
                      <ShieldCheck className="size-[18px]" />
                      {t("staff")}
                      {user.staffAlerts > 0 && (
                        <span className="ml-auto min-w-5 rounded-full bg-(--bubblegum) px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                          {user.staffAlerts}
                        </span>
                      )}
                    </Link>
                  </li>
                )}
                <li>
                  <form action={logoutUrl} method="post">
                    <button type="submit" className={`${menuLink} w-full`}>
                      <LogOut className="size-[18px]" />
                      {t("logout")}
                    </button>
                  </form>
                </li>
              </ul>
            </section>
          </div>
        </nav>
      )}
    </header>
  );
}
