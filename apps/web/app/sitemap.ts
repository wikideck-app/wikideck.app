import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";
import { CONTENT_UPDATED, PUBLIC_PATHS, SITE_URL } from "@/lib/site";

const LEGAL_PATHS: readonly string[] = ["/legal-notice", "/privacy", "/terms"];

// changefreq et priority sont ignorés par Google ; lastmod, lui, est utilisé quand il est fiable
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: new Date(LEGAL_PATHS.includes(path) ? LEGAL.updatedAt : CONTENT_UPDATED),
    changeFrequency: path === "/" ? "weekly" : LEGAL_PATHS.includes(path) ? "yearly" : "monthly",
    priority: path === "/" ? 1 : LEGAL_PATHS.includes(path) ? 0.3 : 0.8,
  }));
}
