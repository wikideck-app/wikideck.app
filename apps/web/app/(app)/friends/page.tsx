import type { FriendsResponse } from "@wikideck/shared";
import { FriendsView } from "@/components/friends/friends-view";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Amis — Wikideck" };

export default async function FriendsPage() {
  const data = await apiGet<FriendsResponse>("/friends");
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center font-display text-5xl font-medium">Amis</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        Retrouvez vos amis et échangez des cartes avec eux.
      </p>
      {data ? (
        <FriendsView initial={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">Impossible de charger vos amis.</p>
      )}
    </div>
  );
}
