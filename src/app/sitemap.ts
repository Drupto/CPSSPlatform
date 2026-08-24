import type { MetadataRoute } from "next";
import { siteConfig, absoluteUrl } from "@/lib/seo";
import { getPublishedCoursesServer } from "@/lib/course-server";

// Always render the sitemap on-demand so published courses (fetched via the
// Firebase Admin SDK) are included at request time with production credentials.
export const dynamic = "force-dynamic";

/**
 * Dynamic sitemap — includes static marketing pages plus one entry per
 * published course. Regenerated on each request at build / runtime.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: absoluteUrl("/courses"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/privacy-policy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms-of-service"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic course routes
  const courses = await getPublishedCoursesServer();
  const courseRoutes: MetadataRoute.Sitemap = courses.map((course) => ({
    url: absoluteUrl(`/courses/${course.slug}`),
    lastModified: course.updatedAt?.toDate?.() ?? now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...courseRoutes];
}