import { getTranslations } from "next-intl/server";
import type { MeProfile } from "@wikideck/shared";
import { SettingsView } from "@/components/settings-view";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("settings");

export default async function SettingsPage() {
  const [t, profile] = await Promise.all([getTranslations("settings"), apiGet<MeProfile>("/me")]);

  if (!profile) {
    return (
      <p className="mt-10 text-center text-sm text-danger">
        {t("loadError")}
      </p>
    );
  }
  return <SettingsView profile={profile} apiUrl={API_URL} />;
}
