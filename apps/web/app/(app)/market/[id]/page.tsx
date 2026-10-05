import { notFound } from "next/navigation";
import type { AuctionDetail } from "@wikideck/shared";
import { AuctionView } from "@/components/market/auction-view";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Enchère — Wikideck" };

export default async function AuctionPage({ params }: PageProps<"/market/[id]">) {
  const { id } = await params;
  const auction = await apiGet<AuctionDetail>(`/market/${id}`);
  if (!auction) notFound();
  return <AuctionView initial={auction} apiUrl={API_URL} />;
}
