import { getTranslations } from "next-intl/server";
import type { AlbumsResponse } from "@wikideck/shared";
import { AlbumsView } from "@/components/albums/albums-view";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("albums");

export default async function AlbumsPage() {
  const [t, data] = await Promise.all([getTranslations("albums"), apiGet<AlbumsResponse>("/albums")]);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      {data ? (
        <AlbumsView data={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      )}
    </div>
  );
}
