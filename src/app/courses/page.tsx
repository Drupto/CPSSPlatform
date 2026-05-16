"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getPublishedCourses } from "@/lib/course";
import type { Course } from "@/lib/types";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedCourses()
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-primary">Course Catalog</p>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">Browse available courses</h1>
          <p className="mt-4 text-slate-600">Enroll in courses and access structured learning content.</p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-600">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-600">No courses are available yet.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course) => (
              <article key={course.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-secondary">Course</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">{course.title}</h2>
                  </div>
                  <p className="text-slate-600 min-h-[3rem]">{course.description}</p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xl font-semibold text-slate-900">₹{course.price}</span>
                    <Link href={`/courses/${course.slug}`} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90">
                      View Course
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
