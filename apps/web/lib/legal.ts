// valeur sentinelle : tant qu'elle reste, la page affiche un repère « à compléter »
import { SITE_URL } from "@/lib/site";

export const TODO = "__TODO__";

export const LEGAL = {
  siteName: "Wikideck",
  siteUrl: "https://wikideck.app",
  updatedAt: "2026-10-04",

  publisher: {
    name: "Jessy DAVID",
    status: "individual",
    email: "davidjessy@proton.me",
    director: "Jessy DAVID",
  },

  host: {
    name: "QuantumCraft Studios",
    address: "58 RUE DE MONCEAU 75008 PARIS",
    website: "https://quantumcraft-studios.com",
  },
} as const;

export const LEGAL_LINKS = [
  { href: "/legal-notice", key: "legalNotice" },
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
  { href: "/docs", key: "docs" },
] as const;
