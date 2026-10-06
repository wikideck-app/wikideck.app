import Image from "next/image";
import { redirect } from "next/navigation";
import { LegalLinks } from "@/components/legal/legal-links";
import { DiscordAuth } from "@/components/discord-auth";
import { Features } from "@/components/features";
import { Reveal } from "@/components/reveal";
import { ShowcaseCards } from "@/components/showcase-cards";
import { SiteHeader } from "@/components/site-header";
import { Starfield } from "@/components/starfield";
import { Ticker } from "@/components/ticker";
import { API_URL, getCurrentUser } from "@/lib/api";
import { getShowcase } from "@/lib/showcase";

const HEADLINE = "L'encyclopédie devient votre terrain de jeu.".split(" ");

export default async function Page({ searchParams }: PageProps<"/">) {
  const [user, { auth_error }, showcase] = await Promise.all([
    getCurrentUser(),
    searchParams,
    getShowcase(),
  ]);

  if (user) redirect("/packs");

  return (
    <div
      id="top"
      className="relative flex flex-1 flex-col overflow-x-clip bg-background text-foreground"
    >
      <SiteHeader />

      <div className="on-grape relative bg-(image:--grape-gradient) [clip-path:inset(0)]">
        <Starfield />
        <section className="relative z-10 flex min-h-svh flex-col pt-[72px]">
          <div className="relative mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-6">
            <div className="grid flex-1 items-center gap-12 pb-16 md:grid-cols-2">
              <div>
                <h1 className="font-display text-4xl font-medium sm:text-5xl md:text-6xl xl:text-7xl">
                  {HEADLINE.map((word, i) => (
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
                  Ouvrez des paquets, complétez votre album et défiez vos amis avec des cartes
                  tirées d&apos;articles Wikipédia.
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
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">Cartes</p>
              <h2 className="font-display mt-4 text-3xl font-medium sm:text-5xl">
                Chaque carte est un vrai article.
              </h2>
              <p className="prose-serif mt-5 text-pale-mist">
                Sa fréquentation sur Wikipédia fixe sa rareté. Retournez les cartes pour lire
                l&apos;article.
              </p>
            </Reveal>
            <div className="mt-16">
              <ShowcaseCards cards={showcase} />
            </div>
          </section>
        )}

        <section id="game" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fog">Le jeu</p>
            <h2 className="font-display mt-4 text-3xl font-medium sm:text-5xl">
              Collectionnez, échangez, progressez.
            </h2>
          </Reveal>
          <div className="mt-14">
            <Features />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-6 pb-28">
          <Reveal className="on-grape rounded-xl bg-(image:--grape-gradient) px-7 py-16 text-center">
            <h2 className="font-display mx-auto max-w-xl text-3xl font-medium sm:text-5xl">
              Prêt à ouvrir votre premier paquet ?
            </h2>
            <a
              href="#login"
              className="mt-8 inline-flex rounded-full border-2 border-(--deep-concord) bg-white px-6 py-3 text-base font-semibold text-(--deep-concord) shadow-[inset_0_0_0_2px_#fff] transition hover:bg-(--deep-concord) hover:text-white"
            >
              Commencer avec Discord
            </a>
          </Reveal>
        </section>

        <footer className="on-midnight mt-auto bg-black">
          <div className="mx-auto w-full max-w-[1200px] px-6 py-10 text-xs text-fog">
            <p>
              Wikideck n&apos;est pas affilié à Wikipédia. Texte des articles : CC BY-SA 4.0 —
              crédits sur la page de chaque article.
            </p>
            <LegalLinks className="mt-3" />
          </div>
        </footer>
      </main>
    </div>
  );
}
