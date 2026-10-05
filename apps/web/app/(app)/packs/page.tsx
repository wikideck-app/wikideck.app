import type { DropRatesResponse, PackStatus, TagDto } from "@wikideck/shared";
import { HowItWorks } from "@/components/how-it-works";
import { PackOpener } from "@/components/pack-opener";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Ouvrir un paquet — Wikideck" };

export default async function PacksPage() {
  const [status, tags, drops] = await Promise.all([
    apiGet<PackStatus>("/packs"),
    apiGet<{ tags: TagDto[] }>("/tags"),
    apiGet<DropRatesResponse>("/cards/rates"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
      <h1 className="font-display text-5xl font-medium">Ouvrir un paquet</h1>
      <p className="mt-2 opacity-60">Découvrez 5 nouvelles cartes Wikipédia</p>
      <HowItWorks drops={drops} />

      {status ? (
        <PackOpener initial={status} apiUrl={API_URL} tags={tags?.tags} />
      ) : (
        <p className="mt-10 text-sm text-danger">Impossible de charger vos paquets.</p>
      )}
    </div>
  );
}
