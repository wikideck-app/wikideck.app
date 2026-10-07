import type { AlbumsResponse } from "@wikideck/shared";
import { AlbumsView } from "@/components/albums/albums-view";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Albums — Wikideck" };

export default async function AlbumsPage() {
  const data = await apiGet<AlbumsResponse>("/albums");
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center font-display text-5xl font-medium">Albums</h1>
      {data ? (
        <AlbumsView data={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">Impossible de charger vos albums.</p>
      )}
    </div>
  );
}
