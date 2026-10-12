"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "@/components/icons";

export type SearchEntry = { href: string; title: string; hint: string; method?: string };

// recherche dans les titres de la documentation et dans les routes ; Ctrl K / ⌘ K pour la focaliser
export function DocsSearch({ entries }: { entries: SearchEntry[] }) {
  const t = useTranslations("docs.site.search");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === "Escape") input.current?.blur();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const words = query.toLocaleLowerCase("fr-FR").split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return entries
      .filter((e) => {
        const text = `${e.title} ${e.hint}`.toLocaleLowerCase("fr-FR");
        return words.every((w) => text.includes(w));
      })
      .slice(0, 8);
  }, [entries, query]);

  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
      <input
        ref={input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("placeholder")}
        aria-label={t("label")}
        className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-16 text-sm outline-none focus:border-accent"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 py-0.5 text-[10px] text-fog sm:block">
        {t("shortcut")}
      </kbd>
      {open && query.trim() && (
        <ul className="absolute right-0 z-30 mt-2 max-h-96 w-full min-w-72 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-float">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-fog">{t("empty")}</li>
          ) : (
            results.map((r) => (
              <li key={r.href}>
                <a href={r.href} onClick={() => setQuery("")} className="flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-foreground/10">
                  {r.method && (
                    <span className="mt-0.5 rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold">{r.method}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{r.title}</span>
                    <span className="block truncate text-xs text-fog">{r.hint}</span>
                  </span>
                </a>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
