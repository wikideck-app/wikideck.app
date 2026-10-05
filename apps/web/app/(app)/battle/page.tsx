import type { BattleHistoryResponse } from "@wikideck/shared";
import { BattleView } from "@/components/battle/battle-view";
import { redirect } from "next/navigation";
import { API_URL, apiGet, getCurrentUser } from "@/lib/api";

export const metadata = { title: "Bataille — Wikideck" };

export default async function BattlePage({ searchParams }: PageProps<"/battle">) {
  const [data, me, params] = await Promise.all([
    apiGet<BattleHistoryResponse>("/battle/games"),
    getCurrentUser(),
    searchParams,
  ]);
  if (!me) redirect("/");
  const room = typeof params.room === "string" ? params.room.toUpperCase().slice(0, 4) : "";
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-center font-display text-5xl font-medium">Bataille</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        Affrontez d&apos;autres joueurs : d&apos;un article de départ à l&apos;article cible, en ne
        cliquant que sur des liens. Le plus rapide gagne.
      </p>
      <BattleView initial={data} apiUrl={API_URL} meId={me.id} initialCode={room} />
    </div>
  );
}
