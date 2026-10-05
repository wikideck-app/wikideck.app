import { redirect } from "next/navigation";
import { RARITIES, type CatalogResponse } from "@wikideck/shared";
import { CatalogView } from "@/components/catalog-view";
import { catalogHref } from "@/lib/catalog-href";
import { API_URL, apiGet } from "@/lib/api";
import { RARITY_COLOR } from "@/lib/rarity-ui";

export const metadata = { title: "Toutes les cartes — Wikideck" };

export default async function CatalogPage({ searchParams }: PageProps<"/cards">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const page = Math.max(1, Math.floor(Number(one(params.page))) || 1);
  const query = new URLSearchParams({ page: String(page) });
  for (const key of ["sort", "show", "q", "rarity"] as const) {
    const value = one(params[key])?.trim();
    if (value) query.set(key, value);
  }

  const data = await apiGet<CatalogResponse>(`/cards?${query}`);

  if (data && page > data.totalPages) {
    redirect(catalogHref({ ...data, query: data.query, page: data.totalPages }));
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <h1 className="text-center font-display text-5xl font-medium">Toutes les cartes</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        Chaque article de Wikipédia FR est une carte.
      </p>
      {data && <CatalogSummary data={data} />}
      {!data ? (
        <p className="mt-10 text-center text-sm text-danger">Impossible de charger les cartes.</p>
      ) : (
        <CatalogView data={data} apiUrl={API_URL} />
      )}
    </div>
  );
}

const fmt = new Intl.NumberFormat("fr-FR");

function CatalogSummary({ data }: { data: CatalogResponse }) {
  return (
    <section className="mx-auto mt-6 max-w-3xl rounded-xl border border-line px-5 py-4 bg-surface">
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        {data.counts.map(({ rarity, count }) => {
          const info = RARITIES.find((r) => r.value === rarity)!;
          return (
            <li key={rarity} title={info.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 rounded-[3px]"
                style={{ backgroundColor: RARITY_COLOR[rarity] }}
              />
              <span className="text-fog">{info.code}:</span>
              <span className="font-bold tabular-nums">{fmt.format(count)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-xs text-fog">
        {fmt.format(data.catalog)} cartes au total · vous en possédez {fmt.format(data.owned)}
      </p>
    </section>
  );
}
