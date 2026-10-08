import { notFound } from "next/navigation";
import { RARITIES, type AlbumResponse } from "@wikideck/shared";
import { AlbumView } from "@/components/albums/album-view";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("album");

export default async function AlbumPage({ params, searchParams }: PageProps<"/albums/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const query = new URLSearchParams();
  const q = one(sp.q).trim();
  const rarity = one(sp.rarity);
  const scope = one(sp.scope) === "all" ? "all" : null;
  const page = Math.max(1, Math.floor(Number(one(sp.page))) || 1);
  if (q) query.set("q", q);
  if (scope) query.set("scope", scope);
  if (RARITIES.some((r) => rarity.split(",").includes(r.code))) query.set("rarity", rarity);
  if (page > 1) query.set("page", String(page));
  const data = await apiGet<AlbumResponse>(`/albums/${encodeURIComponent(id)}?${query}`);
  if (!data) notFound();
  return <AlbumView data={data} apiUrl={API_URL} />;
}
