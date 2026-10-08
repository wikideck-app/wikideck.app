// adresse publique du site (canonicals, sitemap, Open Graph) ; surchargeable par environnement
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wikideck.app").replace(/\/$/, "");

// pages publiques indexables (le reste est derrière la connexion Discord)
export const PUBLIC_PATHS = ["/", "/legal-notice", "/privacy", "/terms", "/docs"] as const;

// serveur Discord de la communauté (redirection gérée côté site)
export const DISCORD_URL = "https://wikideck.app/discord";
