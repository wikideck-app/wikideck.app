import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Faq } from "@/components/faq";
import { JsonLd } from "@/components/json-ld";
import { RARITY_COLOR } from "@/lib/rarity-ui";
import { RARITIES, type Rarity } from "@wikideck/shared";
import { breadcrumbs, faqPage, graph, webPage } from "@/lib/structured-data";

export type SeoPageKind = "wikipedia" | "anime";

const PATH: Record<SeoPageKind, string> = { wikipedia: "/cartes-wikipedia", anime: "/cartes-anime-manga" };
const TITLE_KEY = { wikipedia: "cartesWikipedia", anime: "cartesAnime" } as const;
const SECTIONS = ["a", "b", "c"] as const;
const FAQ = ["0", "1", "2", "3"] as const;

// page de présentation d'une collection (Wikipédia ou anime et manga) : contenu rédigé, raretés, FAQ et données structurées
export async function SeoPage({ kind }: { kind: SeoPageKind }) {
  const [page, tm, locale] = await Promise.all([
    getTranslations("seoPages"),
    getTranslations("meta"),
    getLocale(),
  ]);
  // les textes de chaque page sont regroupés par collection : seoPages.<wikipedia|anime>.<clé>
  const t = (key: string) => page(`${kind}.${key}` as never);
  const name = tm(`pages.${TITLE_KEY[kind]}`);
  const description = tm(`descriptions.${TITLE_KEY[kind]}`);
  const faq = FAQ.map((i) => ({ q: t(`faq.${i}.q`), a: t(`faq.${i}.a`) }));
  const rarityRows = RARITIES.map((r) => ({
    value: r.value as Rarity,
    code: r.code,
    label: r.label,
    detail: t(`rarities.${r.value}`),
  }));

  return (
    <article>
      <JsonLd
        data={graph(
          webPage(name, description, PATH[kind], locale),
          breadcrumbs([
            { name: tm("siteName"), path: "/" },
            { name, path: PATH[kind] },
          ]),
          faqPage(faq),
        )}
      />
      <nav aria-label={t("breadcrumb")} className="text-xs text-fog">
        <Link href="/" className="hover:text-foreground">
          {tm("siteName")}
        </Link>{" "}
        / <span>{t("crumb")}</span>
      </nav>
      <h1 className="mt-4 font-display text-4xl font-semibold sm:text-6xl">{t("h1")}</h1>
      <p className="prose-serif mt-5 max-w-3xl text-lg text-pale-mist">{t("intro")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/#login" className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-foreground hover:bg-accent/80">
          {t("cta")}
        </Link>
        <Link
          href={kind === "wikipedia" ? "/cartes-anime-manga" : "/cartes-wikipedia"}
          className="rounded-xl border border-line px-6 py-3 font-semibold hover:bg-foreground/10"
        >
          {t("other")}
        </Link>
      </div>

      {SECTIONS.map((s) => (
        <section key={s} className="mt-14 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t(`sections.${s}.title`)}</h2>
          <p className="prose-serif mt-3 text-pale-mist">{t(`sections.${s}.text`)}</p>
        </section>
      ))}

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("raritiesTitle")}</h2>
        <p className="prose-serif mt-3 max-w-3xl text-pale-mist">{t("raritiesIntro")}</p>
        <div className="mt-6 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-xs uppercase tracking-[0.12em] text-fog">
              <tr>
                <th scope="col" className="px-4 py-2.5">{t("rarityName")}</th>
                <th scope="col" className="px-4 py-2.5">{t("rarityRule")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {rarityRows.map((r) => (
                <tr key={r.value}>
                  <th scope="row" className="whitespace-nowrap px-4 py-2.5 font-semibold" style={{ color: RARITY_COLOR[r.value] }}>
                    {r.label} <span className="opacity-70">({r.code})</span>
                  </th>
                  <td className="px-4 py-2.5 text-pale-mist">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("faqTitle")}</h2>
        <Faq items={faq} />
      </section>

      <p className="mt-12 text-xs text-fog">{t("credits")}</p>
    </article>
  );
}
