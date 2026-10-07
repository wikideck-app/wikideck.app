import type { MetadataRoute } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [t, locale] = await Promise.all([getTranslations("meta"), getLocale()]);
  return {
    name: t("siteName"),
    short_name: t("siteName"),
    description: t("tagline"),
    lang: locale,
    start_url: "/packs",
    display: "standalone",
    background_color: "#3f0791",
    theme_color: "#3f0791",
    icons: [{ src: "/icon.png", type: "image/png", sizes: "any" }],
  };
}
