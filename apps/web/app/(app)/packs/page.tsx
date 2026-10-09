import { getTranslations } from "next-intl/server";
import { PACK_SIZE, type DropRatesResponse, PackStatus, TagDto } from "@wikideck/shared";
import { HowItWorks } from "@/components/how-it-works";
import { PackOpener } from "@/components/pack-opener";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("packs");

export default async function PacksPage() {
  const [t, status, tags, drops] = await Promise.all([
    getTranslations("packs"),
    apiGet<PackStatus>("/packs"),
    apiGet<{ tags: TagDto[] }>("/tags"),
    apiGet<DropRatesResponse>("/cards/rates"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
      <h1 className="font-display text-5xl font-medium">{t("title")}</h1>
      <p className="mt-2 opacity-60">{t("subtitle", { count: PACK_SIZE })}</p>
      <HowItWorks drops={drops} />

      {status ? (
        <PackOpener initial={status} apiUrl={API_URL} tags={tags?.tags} />
      ) : (
        <p className="mt-10 text-sm text-danger">{t("loadError")}</p>
      )}
    </div>
  );
}
