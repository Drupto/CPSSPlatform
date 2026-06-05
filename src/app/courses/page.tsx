"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { getPublishedCourses } from "@/lib/course";
import type { Course } from "@/lib/types";
import { Input } from "@/components/ui/input";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getPublishedCourses()
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const query = searchQuery.toLowerCase().trim();
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query)
    );
  }, [courses, searchQuery]);

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-primary">Course Catalog</p>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">Browse available courses</h1>
          <p className="mt-4 text-slate-600">Enroll in courses and access structured learning content.</p>
        </div>

        {!loading && (
          <div className="relative mb-8 max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search courses by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-2xl border-slate-200"
            />
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-600">Loading courses...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">
            {searchQuery.trim() ? (
              <>No courses match "{searchQuery}". Try a different search term.</>
            ) : (
              <>No courses are available yet.</>
            )}
          </div>
        ) : (
          <>
            {searchQuery.trim() && (
              <p className="text-sm text-slate-500 mb-4 text-center">
                Found {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} matching "{searchQuery}"
              </p>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              {filteredCourses.map((course) => (
                <article key={course.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="space-y-4">
                     <div>
                       <p className="text-sm uppercase tracking-[0.3em] text-secondary">Course</p>
                       <h2 className="mt-2 text-2xl font-semibold text-slate-900">{course.title}</h2>
                       <p className="text-xs text-slate-500 mt-1">ID: {course.id}</p>
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
          </>
        )}
      </div>
    </main>
  );
}
