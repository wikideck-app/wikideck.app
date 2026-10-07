"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { AuctionDto } from "@wikideck/shared";
import { WikiCard } from "@/components/wiki-card";
import { Wikibits } from "@/components/wikibit";
import { Countdown } from "./countdown";

// identifiant du badge (marché.badges.<id>) ; null quand il n'y a rien à signaler
export function auctionBadge(a: AuctionDto) {
  if (a.status === "SOLD") return a.viewer.isLeader ? "won" : "sold";
  if (a.status === "UNSOLD") return "unsold";
  if (a.status === "CANCELLED") return "cancelled";
  if (a.viewer.isSeller) return "yourSale";
  if (a.viewer.isLeader) return "leading";
  if (a.viewer.hasBid) return "outbid";
  return null;
}

export function AuctionTile({ auction: a }: { auction: AuctionDto }) {
  const t = useTranslations("market");
  const router = useRouter();
  const badge = auctionBadge(a);
  const active = a.status === "ACTIVE";
  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={t("tile.view", { title: a.card.title })}
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
            {t("tile.bids", { count: a.bidCount })}
          </span>
        </div>
        <div className="mt-0.5 flex min-h-5 items-center justify-between gap-2 text-xs text-fog">
          {active ? <Countdown endsAt={a.endsAt} /> : <span>{badge && t(`badges.${badge}`)}</span>}
          {badge && active && (
            <span className="rounded-full border border-line px-2 py-px text-[10px] font-bold text-pale-mist">
              {t(`badges.${badge}`)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
