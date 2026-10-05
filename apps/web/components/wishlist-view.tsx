"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { WishlistResponse } from "@wikideck/shared";
import { CardDetail } from "@/components/card-detail";
import { WikiCard } from "@/components/wiki-card";

export function WishlistView({ data, apiUrl }: { data: WishlistResponse; apiUrl: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.cards.find((c) => c.id === selectedId);
  const missing = data.cards.filter((c) => c.quantity === 0).length;

  return (
    <>
      <p className="mt-3 text-center text-sm text-pale-mist">
        {data.cards.length === 0
          ? "Marquez des cartes avec le cœur pour les retrouver ici."
          : `${data.cards.length} / ${data.max} cartes · il vous en manque ${missing}.`}
      </p>

      {data.cards.length === 0 ? (
        <p className="mt-10 text-center">
          <Link href="/cards" className="underline hover:text-foreground">
            Parcourir toutes les cartes
          </Link>
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {data.cards.map((card) => (
            <button
              key={card.id}
              type="button"
              aria-label={`Voir ${card.title}`}
              onClick={() => setSelectedId(card.id)}
              className="relative rounded-[9.6%/6.5%] text-left outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <WikiCard card={card} compact />
              <span
                className={`pointer-events-none absolute inset-x-1.5 bottom-1.5 w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${
                  card.quantity > 0 ? "bg-success/90" : "bg-black/75"
                }`}
              >
                {card.quantity > 0 ? `Possédée ×${card.quantity}` : "Il me manque"}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <CardDetail
          card={selected}
          quantity={selected.quantity}
          apiUrl={apiUrl}
          onClose={() => {
            setSelectedId(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
