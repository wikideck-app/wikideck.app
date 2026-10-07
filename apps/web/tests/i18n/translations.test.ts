import { describe, expect, it } from "vitest";
import { formatter, plain, translator } from "./helpers";

describe("traductions", () => {
  it("retrouve un message", () => {
    expect(translator("nav")("logout")).toBe("Se déconnecter");
    expect(translator("nav")("items.packs")).toBe("Paquets");
  });

  it("interpole les variables", () => {
    const t = translator("collection.duplicates");
    expect(t("row", { cards: 3, copies: 7 })).toBe("3 cartes · 7 en trop");
    expect(translator("battle.multi")("round", { round: 2, total: 5 })).toBe("Manche 2 / 5");
  });

  it("gère les pluriels du français : 0 et 1 au singulier", () => {
    const t = translator("cards.catalog");
    expect(t("total", { count: 0 })).toBe("0 carte");
    expect(t("total", { count: 1 })).toBe("1 carte");
    expect(t("total", { count: 2 })).toBe("2 cartes");
  });

  it("formate les nombres des pluriels selon la locale", () => {
    expect(plain(translator("cards.catalog")("total", { count: 1250 }))).toBe("1 250 cartes");
  });

  it("gère les ordinaux", () => {
    const t = translator("guild.ranking");
    expect(t("rewardRank", { rank: 1 })).toBe("1re guilde");
    expect(t("rewardRank", { rank: 2 })).toBe("2e guilde");
  });

  it("rend les balises riches", () => {
    const html = translator("auth").rich("consent", {
      strong: (chunks: unknown) => `<b>${chunks}</b>`,
      terms: (chunks: unknown) => `<a href="/terms">${chunks}</a>`,
      privacy: (chunks: unknown) => `<a href="/privacy">${chunks}</a>`,
    });
    expect(String(html)).toContain("<b>18 ans ou plus</b>");
    expect(String(html)).toContain('<a href="/terms">conditions d’utilisation</a>');
  });

  it("utilise les formats nommés dans les messages", () => {
    expect(plain(translator("wheel")("ratesNote", { boostRate: 0.25, rate: 0.05 }))).toContain("25 %");
  });

  it("signale une clé inexistante sans casser l'affichage", () => {
    const errors: string[] = [];
    const t = translator("nav", (e) => errors.push(e.message));
    expect(t("collecton.title")).toBe("nav.collecton.title");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/MISSING_MESSAGE/);
  });

  it("signale une variable manquante", () => {
    const errors: string[] = [];
    const t = translator("battle.multi", (e) => errors.push(e.message));
    t("round", { round: 1 });
    expect(errors[0]).toMatch(/FORMATTING_ERROR/);
  });
});

describe("formats internationaux", () => {
  it("formate les dates en français, fuseau de Paris", () => {
    const date = new Date("2026-10-07T12:00:00Z");
    expect(formatter.dateTime(date, "long")).toBe("7 octobre 2026");
    expect(formatter.dateTime(date, "monthYear")).toBe("octobre 2026");
    expect(plain(formatter.dateTime(date, "time"))).toBe("14:00");
  });

  it("formate les nombres", () => {
    expect(plain(formatter.number(1250))).toBe("1 250");
    expect(plain(formatter.number(0.123, "percent"))).toBe("12,3 %");
    expect(plain(formatter.number(0.00001, "percent3"))).toBe("0,001 %");
  });

  it("formate les montants avec la devise du contexte", () => {
    expect(plain(formatter.number(5.99, { style: "currency", currency: "EUR" }))).toBe("5,99 €");
  });

  it("formate les durées relatives", () => {
    const now = new Date("2026-10-07T12:00:00Z");
    expect(formatter.relativeTime(new Date("2026-10-07T17:00:00Z"), now)).toBe("dans 5 heures");
    expect(formatter.relativeTime(new Date("2026-10-04T12:00:00Z"), now)).toBe("il y a 3 jours");
  });
});
