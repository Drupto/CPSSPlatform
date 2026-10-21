"use client";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getEnrollmentsForUser, getCourseById } from "@/lib/course";
import { isProfileComplete } from "@/lib/profile-check";
import type { Enrollment, Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";

export default function MyCoursesPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Map<string, Course>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      // Check if user has completed their profile
      const isComplete = await isProfileComplete(user);
      if (!isComplete && !window.location.pathname.startsWith('/dashboard/profile')) {
        router.push('/dashboard/profile');
        return;
      }

      // All reads are error-guarded: a course that was unpublished (or deleted)
      // after the enrollment was approved makes its direct doc read fail with
      // permission-denied. One denied read must not leave the page stuck on
      // the loader — skip that course and keep rendering.
      try {
        const userEnrollments = await getEnrollmentsForUser(user.uid);
        setEnrollments(userEnrollments);

        const courseMap = new Map<string, Course>();
        for (const enrollment of userEnrollments) {
          try {
            const course = await getCourseById(enrollment.courseId);
            if (course) {
              courseMap.set(course.id, course);
            }
          } catch {
            // Unpublished/removed course — leave it out of the map.
          }
        }
        setCourses(courseMap);
      } catch (error) {
        console.error("Failed to load my courses:", error);
        // Render the (empty) page instead of hanging on the loader.
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <main className="relative min-h-screen bg-slate-50 dark:bg-zinc-800 dark:bg-zinc-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-zinc-100">My Courses</h1>
            <p className="mt-2 text-slate-600 dark:text-zinc-400">Your enrolled courses and learning journey</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Track your progress in <Link href="/dashboard/progress" className="text-primary hover:underline">My Progress</Link></p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-10 text-slate-600 dark:text-zinc-400">
              Loading your courses...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-10">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100 mb-4">No courses yet</h2>
              <p className="text-slate-600 dark:text-zinc-400 mb-6">You haven't enrolled in any courses yet. Browse the catalog to get started.</p>
              <Link href="/courses" className="inline-flex rounded-full bg-primary px-6 py-3 text-white hover:bg-primary/90">
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
               {enrollments.map((enrollment) => {
                 const course = courses.get(enrollment.courseId);
                 if (!course) return null;

                 const status = enrollment.status ?? "pending";
                 const statusBadge =
                   status === "approved"
                     ? "bg-emerald-100 text-emerald-700"
                     : status === "pending"
                       ? "bg-amber-100 text-amber-700"
                       : "bg-red-100 text-red-700";
                 const statusLabel =
                   status === "approved" ? "Approved" : status === "pending" ? "Payment under review" : "Declined";

                  return (
                    <article key={enrollment.id} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md transition">
                      <div className="space-y-4">
                         <div>
                           <p className="text-sm uppercase tracking-[0.3em] text-secondary">Course</p>
                           <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-zinc-100">{course.title}</h2>
                           <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">ID: {course.id}</p>
                         </div>
                        <p className="text-slate-600 dark:text-zinc-400 line-clamp-2">{course.description}</p>
                        <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge}`}>
                            {statusLabel}
                          </span>
                          {status === "approved" ? (
                            <Link href={`/courses/${course.slug}/learn`} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                              Continue Learning
                            </Link>
                          ) : (
                            <Link href={`/courses/${course.slug}`} className="rounded-full bg-slate-500 dark:bg-zinc-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 dark:hover:bg-zinc-500">
                              View Course
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
               })}
            </div>
          )}

          <div className="pt-8 border-t border-slate-200 dark:border-white/10">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
