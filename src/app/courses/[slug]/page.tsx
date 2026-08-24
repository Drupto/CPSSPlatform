import type { Metadata } from "next";
import { CourseDetail } from "@/components/courses/course-detail";
import { JsonLd } from "@/components/json-ld";
import { buildMetadata, courseJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { getCourseBySlugServer } from "@/lib/course-server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlugServer(slug);

  if (!course) {
    return buildMetadata({
      title: "Course Not Found",
      description: "This course may have been removed or the link is invalid.",
      path: `/courses/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: course.title,
    description: course.description,
    path: `/courses/${course.slug}`,
    image: course.coverImageUrl || undefined,
    keywords: [
      course.title,
      "CSCS exam prep",
      "fitness education course",
      "strength and conditioning",
      "exercise science",
    ],
  });
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = await getCourseBySlugServer(slug);

  return (
    <>
      {course && (
        <JsonLd
          data={[
            courseJsonLd(course),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Courses", path: "/courses" },
              { name: course.title, path: `/courses/${course.slug}` },
            ]),
          ]}
        />
      )}
      <CourseDetail />
    </>
  );
}
