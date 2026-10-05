import { RANKING_BOARDS, type PlayerRankingResponse } from "@wikideck/shared";
import { RankingView } from "@/components/ranking/ranking-view";
import { apiGet } from "@/lib/api";

export const metadata = { title: "Classement — Wikideck" };

export default async function RankingPage({ searchParams }: PageProps<"/ranking">) {
  const { board: asked } = await searchParams;
  const board = RANKING_BOARDS.find((b) => b.value === asked)?.value ?? "collection";
  const data = await apiGet<PlayerRankingResponse>(`/ranking?board=${board}`);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-center font-display text-5xl font-medium">Classement</h1>
      <RankingView board={board} data={data} />
    </div>
  );
}
