import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { CollectionResponse } from "@wikideck/shared";
import { CollectionView } from "@/components/collection-view";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("collection");

export default async function CollectionPage({ searchParams }: PageProps<"/collection">) {
  const [params, t] = await Promise.all([searchParams, getTranslations("collection")]);
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const page = Math.max(1, Math.floor(Number(one(params.page))) || 1);
  const query = new URLSearchParams({ page: String(page) });
  const sort = one(params.sort);
  const tag = one(params.tag);
  if (sort) query.set("sort", sort);
  if (tag) query.set("tag", tag);
  const q = one(params.q)?.trim();
  if (q) query.set("q", q);
  const rarity = one(params.rarity);
  if (rarity) query.set("rarity", rarity);
  const fav = one(params.fav) === "1";
  if (fav) query.set("fav", "1");

  const data = await apiGet<CollectionResponse>(`/collection?${query}`);

  if (data) {
    const keep = new URLSearchParams();
    if (sort) keep.set("sort", data.sort);
    if (data.rarities.length) keep.set("rarity", rarity!);
    if (data.query) keep.set("q", data.query);
    if (fav) keep.set("fav", "1");
    if (tag && !data.tags.some((t) => t.id === tag))
      redirect(keep.size ? `/collection?${keep}` : "/collection");
    if (tag) keep.set("tag", tag);
    if (page > data.totalPages) {
      if (data.totalPages > 1) keep.set("page", String(data.totalPages));
      redirect(keep.size ? `/collection?${keep}` : "/collection");
    }
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      <p className="mt-3 text-center text-xs text-fog">
        {t.rich("importHint", {
          link: (chunks) => (
            <Link href="/import" className="text-pale-mist underline hover:text-foreground">
              {chunks}
            </Link>
          ),
        })}
      </p>
      {data && (
        <p className="mt-2 text-center opacity-60">
          {t(tag ? "countTagged" : "count", { count: data.total })}
        </p>
      )}

      {!data ? (
        <p className="mt-10 text-center text-sm text-danger">
          {t("loadError")}
        </p>
      ) : data.total === 0 && !tag && !data.rarities.length && !data.query && !fav ? (
        <p className="mt-10 text-center opacity-60">
          {t("emptyStart")}
        </p>
      ) : (
        <CollectionView data={data} apiUrl={API_URL} />
      )}
    </div>
  );
}
