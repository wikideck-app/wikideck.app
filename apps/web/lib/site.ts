// adresse publique du site (canonicals, sitemap, Open Graph) ; surchargeable par environnement
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wikideck.app").replace(/\/$/, "");

// pages publiques indexables (le reste est derrière la connexion Discord)
export const PUBLIC_PATHS = [
  "/",
  "/cartes-wikipedia",
  "/cartes-anime-manga",
  "/legal-notice",
  "/privacy",
  "/terms",
  "/docs",
] as const;

// pages de l'espace connecté : inutiles à explorer (un visiteur anonyme est renvoyé vers l'accueil)
export const PRIVATE_PATHS = [
  "/achievements",
  "/albums",
  "/battle",
  "/cards",
  "/collection",
  "/friends",
  "/guild",
  "/import",
  "/market",
  "/messages",
  "/packs",
  "/profile",
  "/quests",
  "/ranking",
  "/settings",
  "/shop",
  "/staff",
  "/trades",
  "/wheel",
  "/wishlist",
  "/docs/staff",
] as const;

// dernière évolution notable du contenu public (lastmod du sitemap) : à mettre à jour quand une page publique change
export const CONTENT_UPDATED = "2026-10-13";

// serveur Discord de la communauté (redirection gérée côté site)
export const DISCORD_URL = "https://wikideck.app/discord";

// compte X (Twitter) de Wikideck
export const X_URL = "https://x.com/wikideckapp";

// comptes publics de Wikideck (données structurées sameAs)
export const SAME_AS = [X_URL, DISCORD_URL] as const;
