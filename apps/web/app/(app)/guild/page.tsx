import { getTranslations } from "next-intl/server";
import type { GuildHome } from "@wikideck/shared";
import { GuildView } from "@/components/guild/guild-view";
import { NoGuild } from "@/components/guild/no-guild";
import { TrustNotice } from "@/components/trust-notice";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("guild");

export default async function GuildPage() {
  const [t, data] = await Promise.all([
    getTranslations("guild"),
    apiGet<GuildHome | { guild: null }>("/guild"),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      <TrustNotice />
      {!data ? (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      ) : data.guild === null ? (
        <NoGuild apiUrl={API_URL} />
      ) : (
        <GuildView home={data as GuildHome} apiUrl={API_URL} />
      )}
    </div>
  );
}
