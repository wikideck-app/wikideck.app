import Image from "next/image";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { DiscordAuth } from "@/components/discord-auth";
import { Faq } from "@/components/faq";
import { Features } from "@/components/features";
import { FooterLinks } from "@/components/footer-links";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { ShowcaseCards } from "@/components/showcase-cards";
import { SiteHeader } from "@/components/site-header";
import { Starfield } from "@/components/starfield";
import { Ticker } from "@/components/ticker";
import { API_URL, getCurrentUser } from "@/lib/api";
import { getAnimeShowcase, getShowcase } from "@/lib/showcase";
import { faqPage, graph, organization, webApplication, website } from "@/lib/structured-data";

export default async function Page({ searchParams }: PageProps<"/">) {
  const [user, { auth_error, ref }, showcase, animeShowcase, t, tm, locale] = await Promise.all([
    getCurrentUser(),
    searchParams,
    getShowcase(),
    getAnimeShowcase(),
    getTranslations("home"),
    getTranslations("meta"),
    getLocale(),
  ]);
  const headline = t("headline").split(" ");
  const faqItems = ["0", "1", "2", "3", "4", "5", "6", "7"].map((i) => ({
    q: t(`faq.items.${i}.q` as never),
    a: t(`faq.items.${i}.a` as never),
  }));
  const jsonLd = graph(
    organization(tm("siteName")),
    website(tm("siteName"), tm("description"), locale),
    webApplication(tm("siteName"), tm("description"), locale, [
      t("features.packs.title"),
      t("features.album.title"),
      t("features.anime.title"),
      t("features.trades.title"),
      t("features.auctions.title"),
      t("features.battle.title"),
      t("features.quests.title"),
      t("features.guild.title"),
    ]),
    faqPage(faqItems),
  );

  if (user) redirect("/packs");

  return (
    <div
      id="top"
      className="relative flex flex-1 flex-col overflow-x-clip bg-background text-foreground"
    >
      <JsonLd data={jsonLd} />
      <SiteHeader />

      <div className="on-grape relative bg-(image:--grape-gradient) [clip-path:inset(0)]">
        <Starfield />
        <section className="relative z-10 flex min-h-svh flex-col pt-[72px]">
          <div className="relative mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-6">
            <div className="grid flex-1 items-center gap-12 pb-16 md:grid-cols-2">
              <div>
                <h1 className="font-display text-4xl font-medium sm:text-5xl md:text-5xl xl:text-6xl">
                  {headline.map((word, i) => (
                    <span key={i}>
                      <span
                        className="reveal-word"
                        style={{ "--delay": `${150 + i * 90}ms` } as React.CSSProperties}
                      >
                        {word}
                      </span>{" "}
                    </span>
                  ))}
                </h1>
                <p
                  className="prose-serif fade-up mt-6 max-w-md text-pale-mist"
                  style={{ "--delay": "800ms" } as React.CSSProperties}
                >
                  {t("tagline")}
                </p>
              </div>

              <div
                id="login"
                className="fade-up flex scroll-mt-24 md:justify-end"
                style={{ "--delay": "950ms" } as React.CSSProperties}
              >
                <DiscordAuth
                  apiUrl={API_URL}
                  error={typeof auth_error === "string" ? auth_error : undefined}
                  referral={typeof ref === "string" ? ref : undefined}
                />
              </div>
            </div>

            <Image
              src="/paquet.webp"
              alt=""
              aria-hidden
              width={1101}
              height={1426}
              priority
              className="animate-float-slow pointer-events-none absolute left-[57%] top-1/2 hidden h-60 w-auto xl:block"
            />
          </div>

          <Ticker />
        </section>
      </div>

      <main className="relative z-10 flex flex-1 flex-col">
        {showcase.length > 0 && (
          <section id="cards" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 py-28">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{t("cards.eyebrow")}</p>
              <h2 className="font-display mt-4 text-3xl font-medium sm:text-5xl">
                {t("cards.title")}
              </h2>
              <p className="prose-serif mt-5 text-pale-mist">
                {t("cards.text")}
              </p>
            </Reveal>
            <div className="mt-16">
              <ShowcaseCards cards={showcase} />
            </div>
          </section>
        )}

        <section id="collections" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{t("collections.eyebrow")}</p>
            <h2 className="font-display mt-4 text-3xl font-medium sm:text-5xl">{t("collections.title")}</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {(
              [
                ["wikipedia", "/cartes-wikipedia"],
                ["anime", "/cartes-anime-manga"],
              ] as const
            ).map(([key, href], i) => (
              <Reveal key={key} delay={i * 120}>
                <article className="flex h-full flex-col rounded-xl border border-line bg-surface p-8 transition-colors duration-300 hover:border-accent">
                  <h3 className="font-display text-2xl font-medium">{t(`collections.${key}.title`)}</h3>
                  <p className="prose-serif mt-3 flex-1 text-pale-mist">{t(`collections.${key}.text`)}</p>
                  <Link href={href} className="mt-6 inline-flex font-semibold text-accent underline-offset-4 hover:underline">
                    {t(`collections.${key}.cta`)} →
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {animeShowcase.length > 0 && (
          <section id="anime" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 pb-28">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{t("anime.eyebrow")}</p>
              <h2 className="font-display mt-4 text-3xl font-medium sm:text-5xl">{t("anime.title")}</h2>
              <p className="prose-serif mt-5 text-pale-mist">{t("anime.text")}</p>
            </Reveal>
            <div className="mt-16">
              <ShowcaseCards cards={animeShowcase} />
            </div>
          </section>
        )}

        <section id="game" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{t("game.eyebrow")}</p>
            <h2 className="font-display mt-4 text-3xl font-medium sm:text-5xl">
              {t("game.title")}
            </h2>
          </Reveal>
          <div className="mt-14">
            <Features />
          </div>
        </section>

        <section id="how" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{t("how.eyebrow")}</p>
            <h2 className="font-display mt-4 text-3xl font-medium sm:text-5xl">{t("how.title")}</h2>
          </Reveal>
          <ol className="mt-14 grid gap-5 md:grid-cols-3">
            {(["login", "open", "play"] as const).map((step, i) => (
              <Reveal key={step} delay={i * 120}>
                <li className="h-full list-none rounded-xl border border-line bg-surface p-7">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{t(`how.steps.${step}.title`)}</h3>
                  <p className="prose-serif mt-2 text-pale-mist">{t(`how.steps.${step}.text`)}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        <section id="faq" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{t("faq.eyebrow")}</p>
            <h2 className="font-display mt-4 text-3xl font-medium sm:text-5xl">{t("faq.title")}</h2>
          </Reveal>
          <Faq items={faqItems} />
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-6 pb-28">
          <Reveal className="on-grape rounded-xl bg-(image:--grape-gradient) px-7 py-16 text-center">
            <h2 className="font-display mx-auto max-w-xl text-3xl font-medium sm:text-5xl">
              {t("cta.title")}
            </h2>
            <a
              href="#login"
              className="mt-8 inline-flex rounded-full border-2 border-(--deep-concord) bg-white px-6 py-3 text-base font-semibold text-(--deep-concord) shadow-[inset_0_0_0_2px_#fff] transition hover:bg-(--deep-concord) hover:text-white"
            >
              {t("cta.button")}
            </a>
          </Reveal>
        </section>

        <footer className="on-midnight mt-auto bg-black">
          <div className="mx-auto w-full max-w-[1200px] px-6 py-10 text-xs text-fog">
            <p>{t("footer.disclaimer")}</p>
            <FooterLinks className="mt-3" />
          </div>
        </footer>
      </main>
    </div>
  );
}
