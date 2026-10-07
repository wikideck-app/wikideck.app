import { getTranslations } from "next-intl/server";
import type { AchievementsResponse } from "@wikideck/shared";
import { AchievementsView } from "@/components/achievements/achievements-view";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("achievements");

export default async function AchievementsPage() {
  const [t, data] = await Promise.all([
    getTranslations("achievements"),
    apiGet<AchievementsResponse>("/achievements"),
  ]);
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      {data ? (
        <AchievementsView data={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      )}
    </div>
  );
}
