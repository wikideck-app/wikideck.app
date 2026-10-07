import { getTranslations } from "next-intl/server";
import type { WheelHistoryResponse, WheelStatus } from "@wikideck/shared";
import { WheelView } from "@/components/wheel/wheel-view";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("wheel");

export default async function WheelPage() {
  const [t, status, history] = await Promise.all([
    getTranslations("wheel"),
    apiGet<WheelStatus>("/wheel"),
    apiGet<WheelHistoryResponse>("/wheel/history"),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-center font-display text-4xl font-medium sm:text-5xl">
        {t("title")}
      </h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        {t("subtitle")}
      </p>
      {status ? (
        <WheelView apiUrl={API_URL} canSpin={status.canSpin} history={history} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      )}
    </div>
  );
}
