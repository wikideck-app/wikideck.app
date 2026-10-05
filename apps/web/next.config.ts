import path from "node:path";
import type { NextConfig } from "next";

const LEGACY_ROUTES: Record<string, string> = {
  paquets: "packs",
  cartes: "cards",
  echanges: "trades",
  marche: "market",
  guilde: "guild",
  amis: "friends",
  succes: "achievements",
  profil: "profile",
  parametres: "settings",
  importer: "import",
  classement: "ranking",
  bataille: "battle",
  "mentions-legales": "legal-notice",
  confidentialite: "privacy",
  cgu: "terms",
};

const nextConfig: NextConfig = {
  async redirects() {
    return Object.entries(LEGACY_ROUTES).flatMap(([from, to]) => [
      { source: `/${from}`, destination: `/${to}`, permanent: true },
      { source: `/${from}/:path*`, destination: `/${to}/:path*`, permanent: true },
    ]);
  },
  transpilePackages: ["@wikideck/shared"],
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
};

export default nextConfig;
