import { SeoPage } from "@/components/seo-page";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("cartesAnime", { path: "/cartes-anime-manga" });

export default function Page() {
  return <SeoPage kind="anime" />;
}
