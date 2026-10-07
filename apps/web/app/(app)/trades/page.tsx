import type { PlayerSummary, TradesResponse } from "@wikideck/shared";
import { TradesView } from "@/components/trades/trades-view";
import { TrustNotice } from "@/components/trust-notice";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("trades");

export default async function TradesPage({ searchParams }: PageProps<"/trades">) {
  const { to } = await searchParams;
  const [data, recipient] = await Promise.all([
    apiGet<TradesResponse>("/trades?box=incoming"),
    typeof to === "string" ? apiGet<PlayerSummary>(`/players/${encodeURIComponent(to)}`) : null,
  ]);
  return (
    <>
      <TrustNotice />
      <TradesView
        apiUrl={API_URL}
        initial={data?.trades ?? null}
        initialRecipient={recipient ?? undefined}
      />
    </>
  );
}
