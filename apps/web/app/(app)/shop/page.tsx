import { getTranslations } from "next-intl/server";
import type { ShopResponse } from "@wikideck/shared";
import { ShopView } from "@/components/shop/shop-view";
import { TrustNotice } from "@/components/trust-notice";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("shop");

export default async function ShopPage() {
  const [t, data] = await Promise.all([getTranslations("shop"), apiGet<ShopResponse>("/shop")]);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">{t("subtitle")}</p>
      <TrustNotice />
      {data ? (
        <ShopView initial={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      )}
    </div>
  );
}
