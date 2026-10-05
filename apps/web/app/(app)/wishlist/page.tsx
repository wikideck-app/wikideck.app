import type { WishlistResponse } from "@wikideck/shared";
import { WishlistView } from "@/components/wishlist-view";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Envies — Wikideck" };

export default async function WishlistPage() {
  const data = await apiGet<WishlistResponse>("/wishlist");
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="text-center font-display text-5xl font-medium">Mes envies</h1>
      {data ? (
        <WishlistView data={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">Impossible de charger vos envies.</p>
      )}
    </div>
  );
}
