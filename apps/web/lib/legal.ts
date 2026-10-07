export const TODO = "À COMPLÉTER";

export const LEGAL = {
  siteName: "Wikideck",
  siteUrl: "https://wikideck.fr",
  updatedAt: "4 octobre 2026",

  publisher: {
    name: "Jessy DAVID",
    status: "Personne physique (éditeur non professionnel)",
    address: TODO,
    email: TODO,
    director: "Jessy DAVID",
  },

  host: {
    name: "QuantumCraft Studios",
    address: TODO,
    phone: TODO,
    website: "https://quantumcraft-studios.com",
  },
} as const;

export const LEGAL_LINKS = [
  { href: "/legal-notice", label: "Mentions légales" },
  { href: "/privacy", label: "Confidentialité" },
  { href: "/terms", label: "CGU" },
  { href: "/docs", label: "API" },
] as const;
