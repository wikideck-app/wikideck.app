import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: path === "/" || path === "/docs" ? undefined : new Date(LEGAL.updatedAt),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/docs" ? 0.5 : 0.3,
  }));
}
