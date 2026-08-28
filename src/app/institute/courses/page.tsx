"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInstitute } from "@/hooks/use-institute";
import { getCoursesForInstitute, deleteCourse, updateCourse } from "@/lib/course";
import { formatINR } from "@/lib/currency";
import type { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function InstituteCoursesPage() {
  const router = useRouter();
  const { institute, loading: loadingInst } = useInstitute();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async (instituteId: string) => {
    try {
      setCourses(await getCoursesForInstitute(instituteId));
    } catch (e) {
      console.error(e);
      setError("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadingInst) return;
    if (!institute) {
      router.push("/");
      return;
    }
    load(institute.id);
  }, [institute, loadingInst, router]);

  const togglePublished = async (course: Course) => {
    setBusy(course.id);
    try {
      await updateCourse(course.id, { published: !course.published });
      setCourses((cs) => cs.map((c) => (c.id === course.id ? { ...c, published: !c.published } : c)));
    } catch (e) {
      console.error(e);
      setError("Failed to update course.");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`Delete "${course.title}"? Students keep access; the course is removed from sale.`)) return;
    setBusy(course.id);
    try {
      await deleteCourse(course.id);
      setCourses((cs) => cs.filter((c) => c.id !== course.id));
    } catch (e) {
      console.error(e);
      setError("Failed to delete course.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="text-slate-600">Loading courses…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Your courses</h2>
          {institute && (
            <p className="text-sm text-slate-500">
              Limit: {institute.limits?.maxCourses ?? "—"} courses
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/institute/courses/new">
            <Plus className="h-4 w-4 mr-1" /> New course
          </Link>
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {courses.length === 0 && (
        <p className="text-slate-600">No courses yet. Create your first course to start selling.</p>
      )}

      <div className="space-y-3">
        {courses.map((course) => (
          <div key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${course.published ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {course.published ? "published" : "draft"}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {course.price > 0 ? formatINR(course.price) : "Free"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => togglePublished(course)} disabled={busy === course.id}>
                {course.published ? <><EyeOff className="h-4 w-4" /> Unpublish</> : <><Eye className="h-4 w-4" /> Publish</>}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/institute/courses/${course.id}/edit`}><Pencil className="h-4 w-4" /></Link>
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(course)} disabled={busy === course.id}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}