import type { BattleHistoryResponse } from "@wikideck/shared";
import { BattleView } from "@/components/battle/battle-view";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { API_URL, apiGet, getCurrentUser } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("battle");

export default async function BattlePage({ searchParams }: PageProps<"/battle">) {
  const [t, data, me, params] = await Promise.all([
    getTranslations("battle"),
    apiGet<BattleHistoryResponse>("/battle/games"),
    getCurrentUser(),
    searchParams,
  ]);
  if (!me) redirect("/");
  const room = typeof params.room === "string" ? params.room.toUpperCase().slice(0, 4) : "";
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        {t("subtitle")}
      </p>
      <BattleView initial={data} apiUrl={API_URL} meId={me.id} initialCode={room} />
    </div>
  );
}
