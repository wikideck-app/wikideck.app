import { getTranslations } from "next-intl/server";
import type { WishlistResponse } from "@wikideck/shared";
import { WishlistView } from "@/components/wishlist-view";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("wishlist");

export default async function WishlistPage() {
  const [t, data] = await Promise.all([
    getTranslations("wishlist"),
    apiGet<WishlistResponse>("/wishlist"),
  ]);
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      {data ? (
        <WishlistView data={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      )}
    </div>
  );
}
