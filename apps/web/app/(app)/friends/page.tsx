import { getTranslations } from "next-intl/server";
import type { FriendsResponse } from "@wikideck/shared";
import { FriendsView } from "@/components/friends/friends-view";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("friends");

export default async function FriendsPage() {
  const [t, data] = await Promise.all([
    getTranslations("friends"),
    apiGet<FriendsResponse>("/friends"),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        {t("subtitle")}
      </p>
      {data ? (
        <FriendsView initial={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      )}
    </div>
  );
}
