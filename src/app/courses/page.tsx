import type { Metadata } from "next";
import { CoursesCatalog } from "@/components/courses/courses-catalog";
import { JsonLd } from "@/components/json-ld";
import { buildMetadata, itemListJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { getPublishedCoursesServer } from "@/lib/course-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const courses = await getPublishedCoursesServer();

  return buildMetadata({
    title: "Course Catalog — Browse CSCS Prep Courses",
    description:
      "Explore KINÉTIKA's catalog of evidence-based fitness education courses. Browse CSCS exam prep, strength and conditioning, and exercise science courses designed by professional sport scientists.",
    path: "/courses",
    keywords: [
      "CSCS prep courses",
      "fitness education courses",
      "strength and conditioning course catalog",
      "exercise science online course",
      "certified strength and conditioning specialist training",
    ],
  });
}

export default async function CoursesPage() {
  const courses = await getPublishedCoursesServer();

  return (
    <>
      <JsonLd
        data={[
          itemListJsonLd(courses),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Courses", path: "/courses" },
          ]),
        ]}
      />
      <CoursesCatalog />
    </>
  );
}