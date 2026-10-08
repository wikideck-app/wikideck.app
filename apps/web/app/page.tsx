import Image from "next/image";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalLinks } from "@/components/legal/legal-links";
import { DiscordAuth } from "@/components/discord-auth";
import { Features } from "@/components/features";
import { Reveal } from "@/components/reveal";
import { ShowcaseCards } from "@/components/showcase-cards";
import { SiteHeader } from "@/components/site-header";
import { Ribbon, Stickers } from "@/components/stickers";
import { Ticker } from "@/components/ticker";
import { API_URL, getCurrentUser } from "@/lib/api";
import { getShowcase } from "@/lib/showcase";
import { SITE_URL } from "@/lib/site";

export default async function Page({ searchParams }: PageProps<"/">) {
  const [user, { auth_error }, showcase, t] = await Promise.all([
    getCurrentUser(),
    searchParams,
    getShowcase(),
    getTranslations("home"),
  ]);
  const headline = t("headline").split(" ");
  const tm = await getTranslations("meta");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tm("siteName"),
    url: SITE_URL,
    description: tm("description"),
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    inLanguage: await getLocale(),
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };

  if (user) redirect("/packs");

  return (
    <div
      id="top"
      className="force-light relative flex flex-1 flex-col overflow-x-clip bg-background text-foreground"
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Ticker />

      {/* cadre noir, panneau pastel arrondi : la page est une affiche */}
      <div className="bg-black p-2 sm:p-4">
        <section
          id="hero"
          className="relative flex min-h-[calc(100svh-3.5rem)] flex-col overflow-clip rounded-[28px] bg-(--sky-wash) sm:rounded-[40px]"
        >
          <Ribbon />
          <SiteHeader />

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-4 text-center">
            <div className="relative">
              <p
                aria-hidden
                className="font-sculpt reveal-word text-[clamp(6rem,24vw,22rem)] text-black"
              >
                {tm("siteName")}
              </p>
              <Stickers />
            </div>

            <h1 className="mt-6 max-w-4xl text-[clamp(1.75rem,4.6vw,4rem)] font-medium leading-[1.05] tracking-tight">
              {headline.map((word, i) => (
                <span key={i}>
                  <span
                    className="reveal-word"
                    style={{ "--delay": `${300 + i * 90}ms` } as React.CSSProperties}
                  >
                    {word}
                  </span>{" "}
                </span>
              ))}
            </h1>
            <p
              className="fade-up mt-4 max-w-xl text-base font-medium text-black/80 sm:text-lg"
              style={{ "--delay": "900ms" } as React.CSSProperties}
            >
              {t("tagline")}
            </p>

            <div
              className="fade-up mt-8 flex flex-wrap items-center justify-center gap-3"
              style={{ "--delay": "1050ms" } as React.CSSProperties}
            >
              <a
                href="#login"
                className="rounded-full border border-black bg-white px-7 py-4 text-sm font-bold uppercase tracking-[0.03em] transition-colors hover:bg-(--sunburst)"
              >
                {t("cta.button")}
              </a>
              <a
                href="#game"
                className="rounded-full border border-black bg-white px-7 py-4 text-sm font-bold uppercase tracking-[0.03em] transition-colors hover:bg-(--sunburst)"
              >
                {t("hero.discover")} ↓
              </a>
            </div>
          </div>
        </section>
      </div>

      <section id="login" className="mx-auto flex w-full max-w-[1200px] scroll-mt-4 flex-col items-center gap-10 px-6 py-24 md:flex-row md:justify-center md:gap-20">
        <Image
          src="/paquet.webp"
          alt=""
          aria-hidden
          width={1101}
          height={1426}
          priority
          className="animate-float-slow pointer-events-none h-56 w-auto md:h-80"
        />
        <DiscordAuth
          apiUrl={API_URL}
          error={typeof auth_error === "string" ? auth_error : undefined}
        />
      </section>

      <main className="relative z-10 flex flex-1 flex-col">
        {showcase.length > 0 && (
          <section id="cards" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 py-28">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{t("cards.eyebrow")}</p>
              <h2 className="font-display mt-4 text-3xl sm:text-5xl">
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

        <section id="game" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">{t("game.eyebrow")}</p>
            <h2 className="font-display mt-4 text-3xl sm:text-5xl">
              {t("game.title")}
            </h2>
          </Reveal>
          <div className="mt-14">
            <Features />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-6 pb-28">
          <Reveal className="rounded-[40px] border border-black bg-(--electric-blue) px-7 py-16 text-center">
            <h2 className="font-display mx-auto max-w-xl text-3xl font-medium sm:text-5xl">
              {t("cta.title")}
            </h2>
            <a
              href="#login"
              className="mt-8 inline-flex rounded-full border border-black bg-black px-6 py-3 text-base font-bold text-white transition hover:bg-white hover:text-black"
            >
              {t("cta.button")}
            </a>
          </Reveal>
        </section>

        <footer className="on-midnight mt-auto bg-black">
          <div className="mx-auto w-full max-w-[1200px] px-6 py-10 text-xs text-fog">
            <p>{t("footer.disclaimer")}</p>
            <LegalLinks className="mt-3" />
          </div>
        </footer>
      </main>
    </div>
  );
}
