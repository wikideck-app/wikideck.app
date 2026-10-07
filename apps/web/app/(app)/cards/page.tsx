import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { RARITIES, type CatalogResponse } from "@wikideck/shared";
import { CatalogView } from "@/components/catalog-view";
import { catalogHref } from "@/lib/catalog-href";
import { API_URL, apiGet } from "@/lib/api";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("cards");

export default async function CatalogPage({ searchParams }: PageProps<"/cards">) {
  const [params, t] = await Promise.all([searchParams, getTranslations("cards.catalog")]);
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
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        {t("subtitle")}
      </p>
      {data && <CatalogSummary data={data} />}
      {!data ? (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      ) : (
        <CatalogView data={data} apiUrl={API_URL} />
      )}
    </div>
  );
}

async function CatalogSummary({ data }: { data: CatalogResponse }) {
  const [t, tr, format] = await Promise.all([
    getTranslations("cards.catalog"),
    getTranslations("cards.rarity"),
    getFormatter(),
  ]);
  return (
    <section className="mx-auto mt-6 max-w-3xl rounded-xl border border-line px-5 py-4 bg-surface">
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        {data.counts.map(({ rarity, count }) => {
          const info = RARITIES.find((r) => r.value === rarity)!;
          return (
            <li key={rarity} title={tr(info.value)} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 rounded-[3px]"
                style={{ backgroundColor: RARITY_COLOR[rarity] }}
              />
              <span className="text-fog">{info.code}:</span>
              <span className="font-bold tabular-nums">{format.number(count)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-xs text-fog">
        {t("summary", { catalog: data.catalog, owned: data.owned })}
      </p>
    </section>
  );
}
