import type { WheelStatus } from "@wikideck/shared";
import { WheelView } from "@/components/wheel/wheel-view";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Roue de la fortune — Wikideck" };

export default async function WheelPage() {
  const status = await apiGet<WheelStatus>("/wheel");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-center font-display text-4xl font-medium sm:text-5xl">
        Roue de la fortune
      </h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        Un tour par jour, gratuit : des wikibits ou des paquets en plus.
      </p>
      {status ? (
        <WheelView apiUrl={API_URL} canSpin={status.canSpin} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">Impossible de charger la roue.</p>
      )}
    </div>
  );
}
