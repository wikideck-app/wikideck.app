import { redirect } from "next/navigation";
import type { MarketResponse } from "@wikideck/shared";
import { MarketView } from "@/components/market/market-view";
import { TrustNotice } from "@/components/trust-notice";
import { Wikibits } from "@/components/wikibit";
import { API_URL, apiGet } from "@/lib/api";
import { marketHref } from "@/lib/market-href";

export const metadata = { title: "Marché — Wikideck" };

export default async function MarketPage({ searchParams }: PageProps<"/market">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const page = Math.max(1, Math.floor(Number(one(params.page))) || 1);
  const query = new URLSearchParams({ page: String(page) });
  for (const key of ["view", "sort", "q", "rarity"] as const) {
    const value = one(params[key])?.trim();
    if (value) query.set(key, value);
  }

  const data = await apiGet<MarketResponse>(`/market?${query}`);
  if (data && page > data.totalPages) redirect(marketHref({ ...data, page: data.totalPages }));

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="text-center">
        <h1 className="font-display text-5xl font-medium">Marché</h1>
        <p className="prose-serif mt-2 text-pale-mist">
          Vendez et achetez des cartes aux enchères, en wikibits.
        </p>
        {data && (
          <p className="mt-3 text-sm text-fog">
            Votre solde : <Wikibits amount={data.wikibits} className="font-bold text-foreground" />
          </p>
        )}
      </div>
      <TrustNotice />
      {data ? (
        <MarketView data={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">Impossible de charger le marché.</p>
      )}
    </div>
  );
}
