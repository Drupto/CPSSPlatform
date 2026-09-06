"use client";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getPublishedCourses, getEnrollmentsForUser } from "@/lib/course";
import { formatCoursePrice } from "@/lib/currency";
import { isProfileComplete } from "@/lib/profile-check";
import type { Course, Enrollment, EnrollmentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { toast } from "@/hooks/use-toast";

export default function AvailableCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const getEnrollmentStatus = (courseId: string): EnrollmentStatus | null => {
    const enrollment = enrollments.find((e) => e.courseId === courseId);
    return enrollment ? enrollment.status : null;
  };

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

      try {
        // Published courses only — a rules-v2-compliant query for non-admins
        // (an unconstrained getAllCourses() query is rejected with
        // permission-denied for students).
        const allCourses = await getPublishedCourses();
        
        // Fetch user's enrollments
        const userEnrollments = await getEnrollmentsForUser(user.uid);
        setEnrollments(userEnrollments);
        
        setCourses(allCourses);
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast({
          title: "Error",
          description: "Failed to load courses. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // All enrollment requests go through the payment page: the student scans
  // the UPI/PayPal QR and submits the transaction reference there.
  const handleRequest = (course: Course) => {
    router.push(`/courses/${course.slug}/pay`);
  };

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Available Courses</h1>
            <p className="mt-2 text-slate-600">Browse and enroll in courses to advance your learning journey</p>
            <p className="mt-2 text-sm text-slate-500">Track your progress in <Link href="/dashboard/progress" className="text-primary hover:underline">My Progress</Link></p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-600">
              Loading available courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">No courses available</h2>
              <p className="text-slate-600 mb-6">There are currently no courses available. Please check back later.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {courses.map((course) => (
                 <article key={course.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                   <div className="space-y-4">
                       <div>
                         <p className="text-sm uppercase tracking-[0.3em] text-secondary">Course</p>
                         <h2 className="mt-2 text-xl font-semibold text-slate-900">{course.title}</h2>
                         <p className="text-xs text-slate-500 mt-1">ID: {course.id}</p>
                       </div>
                     <p className="text-slate-600 line-clamp-2">{course.description}</p>
                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
                        <span className="text-sm text-slate-500">{formatCoursePrice(course)}</span>
                        {getEnrollmentStatus(course.id) === "approved" ? (
                          <Link
                            href={`/courses/${course.slug}/learn`}
                            className="rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white"
                          >
                            Go to Course
                          </Link>
                        ) : getEnrollmentStatus(course.id) === "pending" ? (
                          <Button disabled className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
                            Pending Approval
                          </Button>
                        ) : getEnrollmentStatus(course.id) === "rejected" ? (
                          <Button
                            onClick={() => handleRequest(course)}
                            className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                          >
                            Request Again
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleRequest(course)}
                            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                          >
                            Request Access
                          </Button>
                        )}
                      </div>
                   </div>
                 </article>
              ))}
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