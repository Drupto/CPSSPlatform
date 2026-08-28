"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInstitute } from "@/hooks/use-institute";
import { getEnrollmentsForInstitute } from "@/lib/course-institute";
import { getCourseById } from "@/lib/course";
import type { Enrollment } from "@/lib/types";

interface Row {
  enrollment: Enrollment;
  courseTitle: string;
}

export default function InstituteStudentsPage() {
  const router = useRouter();
  const { institute, loading: loadingInst } = useInstitute();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingInst) return;
    if (!institute) {
      router.push("/");
      return;
    }
    (async () => {
      try {
        const enrollments = await getEnrollmentsForInstitute(institute.id);
        const withCourse = await Promise.all(
          enrollments.map(async (enrollment) => {
            const course = await getCourseById(enrollment.courseId).catch(() => null);
            return { enrollment, courseTitle: course?.title ?? "Unknown course" };
          })
        );
        setRows(withCourse.sort((a, b) => (b.enrollment.enrolledAt?.toDate?.().getTime() ?? 0) - (a.enrollment.enrolledAt?.toDate?.().getTime() ?? 0)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [institute, loadingInst, router]);

  if (loading) return <p className="text-slate-600">Loading students…</p>;

  const active = rows.filter((r) => r.enrollment.status === "approved").length;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Students</h2>
      <p className="text-sm text-slate-500 mb-6">{active} enrolled · {institute?.limits?.maxStudents ?? "—"} student limit</p>

      {rows.length === 0 && <p className="text-slate-600">No students yet. They appear after a course purchase.</p>}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.enrollment.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">
                {row.enrollment.studentName || row.enrollment.studentEmail || row.enrollment.userId}
              </p>
              {row.enrollment.studentEmail && row.enrollment.studentEmail !== row.enrollment.studentName && (
                <p className="text-sm text-slate-500">{row.enrollment.studentEmail}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {row.courseTitle} ·{" "}
                <span className={row.enrollment.status === "approved" ? "text-emerald-600" : row.enrollment.status === "revoked" ? "text-red-600" : "text-amber-600"}>
                  {row.enrollment.status}
                </span>
                {row.enrollment.enrolledAt?.toDate ? ` · enrolled ${row.enrollment.enrolledAt.toDate().toLocaleDateString()}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}