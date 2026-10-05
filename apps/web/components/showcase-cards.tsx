"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { CardDto } from "@wikideck/shared";
import { useInView } from "@/components/reveal";
import { FlipCard } from "@/components/wiki-card";

function Tilt({ children }: { children: ReactNode }) {
  return (
    <div
      className="transition-transform duration-300 ease-out"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        e.currentTarget.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.04)`;
      }}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
    >
      {children}
    </div>
  );
}

export function ShowcaseCards({ cards }: { cards: CardDto[] }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const middle = Math.floor(cards.length / 2);

  useEffect(() => {
    if (!seen) return;
    const timers = cards.map((_, i) =>
      setTimeout(() => setFlipped((prev) => new Set(prev).add(i)), 350 + i * 300),
    );
    return () => timers.forEach(clearTimeout);
  }, [seen, cards]);

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-5 sm:gap-7">
      {cards.map((card, i) => (
        <div key={card.id} className="animate-float-y" style={{ animationDelay: `${i * -1.4}s` }}>
          <Tilt>
            <FlipCard
              card={card}
              flipped={flipped.has(i)}
              compact={i !== middle}
              onToggle={() =>
                setFlipped((prev) => {
                  const next = new Set(prev);
                  if (!next.delete(i)) next.add(i);
                  return next;
                })
              }
              className={i === middle ? "w-52 sm:w-60" : "w-40 sm:w-48"}
            />
          </Tilt>
        </div>
      ))}
    </div>
  );
}
