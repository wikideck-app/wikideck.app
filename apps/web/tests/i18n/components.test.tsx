import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { timeZone } from "@/i18n/config";
import { formats, locale, messages } from "./helpers";

// next/image attend la configuration de Next : un composant vide suffit pour ces tests
vi.mock("next/image", () => ({ default: () => null }));

// next-intl/server lit la requête en cours : on le branche sur les messages de l'application
vi.mock("next-intl/server", async () => {
  const { createFormatter, createTranslator } = await import("next-intl");
  const helpers = await import("./helpers");
  return {
    getTranslations: async (ns?: string | { namespace: string }) =>
      createTranslator({
        locale: helpers.locale,
        messages: helpers.messages,
        formats: helpers.formats,
        namespace: (typeof ns === "string" ? ns : ns?.namespace) as never,
      }),
    getFormatter: async () => createFormatter({ locale: helpers.locale, formats: helpers.formats }),
    getLocale: async () => helpers.locale,
  };
});

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} formats={formats} timeZone={timeZone}>
      {node}
    </NextIntlClientProvider>,
  );

describe("composants client", () => {
  it("DiscordAuth affiche le message d'erreur traduit", async () => {
    const { DiscordAuth } = await import("@/components/discord-auth");
    const html = render(<DiscordAuth apiUrl="http://api" error="banned" />);
    expect(html).toContain("Ce compte est suspendu.");
    expect(html).toContain("Continuer avec Discord");
    expect(html).toContain("<strong");
  });

  it("DiscordAuth retombe sur l'erreur générique pour un code inconnu", async () => {
    const { DiscordAuth } = await import("@/components/discord-auth");
    expect(render(<DiscordAuth apiUrl="http://api" error="???" />)).toContain("Une erreur est survenue.");
  });

  it("LegalLinks traduit la navigation légale", async () => {
    const { LegalLinks } = await import("@/components/legal/legal-links");
    const html = render(<LegalLinks />);
    expect(html).toContain("Mentions légales");
    expect(html).toContain('aria-label="Informations légales"');
  });

  it("Wikibits formate le montant selon la locale", async () => {
    const { Wikibits } = await import("@/components/wikibit");
    expect(render(<Wikibits amount={12500} />).replace(/[  ]/g, " ")).toContain("12 500");
  });
});

describe("composants serveur", () => {
  it("NotFound utilise getTranslations", async () => {
    const { default: NotFound } = await import("@/app/not-found");
    const html = render(await NotFound());
    expect(html).toContain("Cette page n’existe pas");
    expect(html).toContain("Retour à l’accueil");
  });
});

describe("métadonnées SEO", () => {
  it("pageMetadata traduit le titre de la page", async () => {
    const { pageMetadata } = await import("@/i18n/metadata");
    expect(await pageMetadata("collection")()).toEqual({ title: "Collection" });
    expect(await pageMetadata("wheel")()).toEqual({ title: "Roue de la fortune" });
  });

  it("le gabarit du titre et la description viennent des messages", () => {
    expect(messages.meta.titleTemplate).toBe("%s — Wikideck");
    expect(messages.meta.description).toMatch(/Wikipédia/);
  });
});
