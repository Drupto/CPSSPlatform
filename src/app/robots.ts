import type { MetadataRoute } from "next";
import { siteConfig, absoluteUrl } from "@/lib/seo";

/**
 * robots.txt — allows all crawlers on public routes, disallows all
 * authenticated / admin / dashboard routes, and points to the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/admin",
          "/dashboard/",
          "/dashboard",
          "/auth",
          "/courses/*/learn",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}