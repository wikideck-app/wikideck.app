import { SeoPage } from "@/components/seo-page";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("cartesWikipedia", { path: "/cartes-wikipedia" });

export default function Page() {
  return <SeoPage kind="wikipedia" />;
}
