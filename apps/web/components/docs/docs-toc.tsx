"use client";

import { useEffect, useState } from "react";

export type TocItem = { id: string; label: string };

// sommaire de la page : la section visible est mise en avant
export function DocsToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = items.find((i) => seen.get(i.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);
  return (
    <ul className="grid gap-0.5 border-l border-line text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={active === item.id ? "location" : undefined}
            className="-ml-px block border-l-2 border-transparent px-4 py-1.5 text-pale-mist transition-colors hover:text-foreground aria-[current=location]:border-accent aria-[current=location]:font-semibold aria-[current=location]:text-accent"
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
