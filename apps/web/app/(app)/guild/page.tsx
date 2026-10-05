import type { GuildHome } from "@wikideck/shared";
import { GuildView } from "@/components/guild/guild-view";
import { NoGuild } from "@/components/guild/no-guild";
import { TrustNotice } from "@/components/trust-notice";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Guilde — Wikideck" };

export default async function GuildPage() {
  const data = await apiGet<GuildHome | { guild: null }>("/guild");

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center font-display text-5xl font-medium">Guilde</h1>
      <TrustNotice />
      {!data ? (
        <p className="mt-10 text-center text-sm text-danger">Impossible de charger la guilde.</p>
      ) : data.guild === null ? (
        <NoGuild apiUrl={API_URL} />
      ) : (
        <GuildView home={data as GuildHome} apiUrl={API_URL} />
      )}
    </div>
  );
}
