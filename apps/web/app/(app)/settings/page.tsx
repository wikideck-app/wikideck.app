import type { MeProfile } from "@wikideck/shared";
import { SettingsView } from "@/components/settings-view";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Paramètres — Wikideck" };

export default async function SettingsPage() {
  const profile = await apiGet<MeProfile>("/me");

  if (!profile) {
    return (
      <p className="mt-10 text-center text-sm text-danger">
        Impossible de charger vos paramètres pour le moment.
      </p>
    );
  }
  return <SettingsView profile={profile} apiUrl={API_URL} />;
}
