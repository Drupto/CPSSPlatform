"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCourseBySlug, getCourseContent, getEnrollment } from "@/lib/course";
import type { CourseContentItem, Course } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

export default function CourseLearnPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [content, setContent] = useState<CourseContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const loadCourse = async () => {
      const courseData = await getCourseBySlug(slug as string);
      setCourse(courseData);
      if (courseData) {
        const contentData = await getCourseContent(courseData.id);
        setContent(contentData);
      }
    };

    loadCourse().finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !course) {
        setAuthorized(false);
        return;
      }

      const enrollment = await getEnrollment(user.uid, course.id);
      setAuthorized(Boolean(enrollment));
    });

    return () => unsubscribe();
  }, [course]);

  useEffect(() => {
    if (!loading && course && !authorized) {
      router.push(`/courses/${slug}`);
    }
  }, [loading, authorized, course, router, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Checking your access...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <main className="relative min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-28 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Course not found</h1>
          <p className="mt-4 text-slate-600">The requested course could not be loaded.</p>
          <Button className="mt-8" onClick={() => router.push("/courses")}>Back to Courses</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <h1 className="text-4xl font-bold text-slate-900">{course.title}</h1>
            <p className="mt-4 text-slate-600">{course.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">Enrolled course</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">₹{course.price}</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {content.map((item) => (
                <section key={item.id} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">{item.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{item.type.toUpperCase()} section</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">Order {item.order}</span>
                  </div>

                  {item.type === "text" && <p className="text-slate-700 whitespace-pre-line">{item.body}</p>}

                  {item.type === "video" && item.url && (
                    <div className="mt-4">
                      <iframe
                        src={item.url}
                        title={item.title}
                        className="h-64 w-full rounded-3xl border border-slate-200"
                      />
                    </div>
                  )}

                  {item.type === "document" && item.url && (
                    <div className="mt-4">
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        View document
                      </a>
                    </div>
                  )}
                </section>
              ))}
            </div>

            <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Course Summary</h2>
              <div className="space-y-3 text-slate-600">
                <p>{content.length} section{content.length === 1 ? "" : "s"}</p>
                <p>{course.published ? "This course is published and available." : "This course is not published."}</p>
              </div>
              <Button className="w-full" onClick={() => router.push("/courses")}>Back to Catalog</Button>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
