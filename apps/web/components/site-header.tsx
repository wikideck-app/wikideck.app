"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "#cards", label: "Cartes" },
  { href: "#game", label: "Le jeu" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 12);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="on-grape fade-up sticky top-0 z-50 -mb-[72px] h-[72px] border-b border-transparent transition-colors duration-500 data-[scrolled=true]:border-white/20 data-[scrolled=true]:bg-[var(--theme-bar-solid)]"
    >
      <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between gap-4 px-6">
        <a
          href="#top"
          aria-label="Wikideck, retour en haut"
          className="group flex items-center gap-3"
        >
          <Image
            src="/logo.webp"
            alt=""
            width={96}
            height={96}
            priority
            className="size-11 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110 sm:size-12"
          />
          <span className="text-xl font-bold tracking-tight sm:text-2xl">Wikideck</span>
        </a>

        <nav className="flex items-center gap-2 sm:gap-6">
          <ul className="hidden items-center gap-6 sm:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm font-bold uppercase text-pale-mist transition-colors hover:text-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#login"
            className="rounded-full border-2 border-[var(--deep-concord)] bg-white px-5 py-2 text-sm font-semibold text-[var(--deep-concord)] shadow-[inset_0_0_0_2px_#fff] transition-colors hover:bg-[var(--deep-concord)] hover:text-white"
          >
            Se connecter
          </a>
        </nav>
      </div>
    </header>
  );
}
