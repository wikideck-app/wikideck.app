import type { MetadataRoute } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [t, locale] = await Promise.all([getTranslations("meta"), getLocale()]);
  return {
    name: t("siteName"),
    short_name: t("siteName"),
    description: t("tagline"),
    lang: locale,
    id: "/",
    start_url: "/packs",
    scope: "/",
    display: "standalone",
    categories: ["games", "entertainment"],
    // couleurs du thème sombre du site (Ayu) : fond au lancement et barre du système
    background_color: "#10141c",
    theme_color: "#10141c",
    icons: [
      { src: "/icons/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icons/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
      // zone de sécurité respectée : le système peut l'arrondir ou la découper sans rogner le logo
      { src: "/icons/maskable-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
