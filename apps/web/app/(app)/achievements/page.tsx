import type { AchievementsResponse } from "@wikideck/shared";
import { AchievementsView } from "@/components/achievements/achievements-view";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Succès — Wikideck" };

export default async function AchievementsPage() {
  const data = await apiGet<AchievementsResponse>("/achievements");
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="text-center font-display text-5xl font-medium">Succès</h1>
      {data ? (
        <AchievementsView data={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">Impossible de charger vos succès.</p>
      )}
    </div>
  );
}
