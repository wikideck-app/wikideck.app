import { getTranslations } from "next-intl/server";
import { RANKING_BOARDS, type PlayerRankingResponse } from "@wikideck/shared";
import { RankingView } from "@/components/ranking/ranking-view";
import { apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("ranking");

export default async function RankingPage({ searchParams }: PageProps<"/ranking">) {
  const [{ board: asked }, t] = await Promise.all([searchParams, getTranslations("ranking")]);
  const board = RANKING_BOARDS.find((b) => b.value === asked)?.value ?? "collection";
  const data = await apiGet<PlayerRankingResponse>(`/ranking?board=${board}`);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      <RankingView board={board} data={data} />
    </div>
  );
}
