"use client";

import { useRouter } from "next/navigation";
import type { AuctionDto } from "@wikideck/shared";
import { WikiCard } from "@/components/wiki-card";
import { Wikibits } from "@/components/wikibit";
import { Countdown } from "./countdown";

export function auctionBadge(a: AuctionDto): string | null {
  if (a.status === "SOLD")
    return a.viewer.isLeader ? "Remportée" : a.viewer.isSeller ? "Vendue" : "Vendue";
  if (a.status === "UNSOLD") return "Invendue";
  if (a.status === "CANCELLED") return "Annulée";
  if (a.viewer.isSeller) return "Votre vente";
  if (a.viewer.isLeader) return "Vous menez";
  if (a.viewer.hasBid) return "Surenchéri";
  return null;
}

export function AuctionTile({ auction: a }: { auction: AuctionDto }) {
  const router = useRouter();
  const badge = auctionBadge(a);
  const active = a.status === "ACTIVE";
  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Voir l'enchère : ${a.card.title}`}
      onClick={(e) => !(e.target as HTMLElement).closest("a") && router.push(`/market/${a.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/market/${a.id}`)}
      className="cv-item group block cursor-pointer rounded-[9.6%/6.5%] outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className={`transition group-hover:-translate-y-1 ${active ? "" : "opacity-60"}`}>
        <WikiCard card={a.card} compact />
      </div>
      <div className="mt-2 px-1 pb-1">
        <div className="flex items-baseline justify-between gap-2">
          <Wikibits amount={a.currentBid ?? a.startPrice} className="text-base font-bold" />
          <span className="text-[11px] text-fog">
            {a.bidCount === 0 ? "Aucune mise" : `${a.bidCount} mise${a.bidCount > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="mt-0.5 flex min-h-5 items-center justify-between gap-2 text-xs text-fog">
          {active ? <Countdown endsAt={a.endsAt} /> : <span>{auctionBadge(a)}</span>}
          {badge && active && (
            <span className="rounded-full border border-line px-2 py-px text-[10px] font-bold text-pale-mist">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
