import { getTranslations } from "next-intl/server";
import type { QuestsResponse } from "@wikideck/shared";
import { Scroll } from "@/components/icons";
import { QuestsView } from "@/components/quests/quests-view";
import { WikibitIcon } from "@/components/wikibit";
import { API_URL, apiGet } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("quests");

export default async function QuestsPage() {
  const [t, data] = await Promise.all([getTranslations("quests"), apiGet<QuestsResponse>("/quests")]);
  return (
    <div className="mx-auto max-w-6xl">
      <header className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-10 sm:px-10 sm:py-12">
        {/* décor : halo doré et pièces, sans image à charger */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-72 rounded-full bg-accent/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 items-center gap-3 md:flex"
        >
          <Scroll className="size-24 text-accent/30" />
          <WikibitIcon className="size-20 opacity-90 drop-shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_55%,transparent)]" />
        </div>
        <span className="inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          {t("eyebrow")}
        </span>
        <h1 className="mt-4 max-w-xl font-display text-4xl font-medium leading-tight sm:text-5xl">
          {t.rich("heading", {
            accent: (chunks) => <span className="text-accent">{chunks}</span>,
          })}
        </h1>
        <p className="prose-serif mt-3 max-w-md text-pale-mist">{t("subtitle")}</p>
      </header>

      {data ? (
        <QuestsView initial={data} apiUrl={API_URL} />
      ) : (
        <p className="mt-10 text-center text-sm text-danger">{t("loadError")}</p>
      )}
    </div>
  );
}
