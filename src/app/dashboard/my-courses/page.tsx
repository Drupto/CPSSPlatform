"use client";

export const dynamic = 'force-dynamic';

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

      const userEnrollments = await getEnrollmentsForUser(user.uid);
      setEnrollments(userEnrollments);

      const courseMap = new Map<string, Course>();
      for (const enrollment of userEnrollments) {
        const course = await getCourseById(enrollment.courseId);
        if (course) {
          courseMap.set(course.id, course);
        }
      }
      setCourses(courseMap);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">My Courses</h1>
            <p className="mt-2 text-slate-600">Your enrolled courses and learning journey</p>
            <p className="mt-2 text-sm text-slate-500">Track your progress in <Link href="/dashboard/progress" className="text-primary hover:underline">My Progress</Link></p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-600">
              Loading your courses...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">No courses yet</h2>
              <p className="text-slate-600 mb-6">You haven't enrolled in any courses yet. Browse the catalog to get started.</p>
              <Link href="/courses" className="inline-flex rounded-full bg-primary px-6 py-3 text-white hover:bg-primary/90">
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {enrollments.map((enrollment) => {
                const course = courses.get(enrollment.courseId);
                if (!course) return null;

                 return (
                   <article key={enrollment.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                     <div className="space-y-4">
                        <div>
                          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Course</p>
                          <h2 className="mt-2 text-xl font-semibold text-slate-900">{course.title}</h2>
                          <p className="text-xs text-slate-500 mt-1">ID: {course.id}</p>
                        </div>
                       <p className="text-slate-600 line-clamp-2">{course.description}</p>
                       <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
                         <span className="text-sm text-slate-500">₹{course.price}</span>
                         <Link href={`/courses/${course.slug}/learn`} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                           Continue Learning
                         </Link>
                       </div>
                     </div>
                   </article>
                 );
              })}
            </div>
          )}

          <div className="pt-8 border-t border-slate-200">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
