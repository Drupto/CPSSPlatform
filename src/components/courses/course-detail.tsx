"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCourseBySlug, requestEnrollment, getEnrollment } from "@/lib/course";
import { isProfileComplete } from "@/lib/profile-check";
import type { Course, EnrollmentStatus } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

/**
 * Client-side course detail component.
 * The parent server component handles metadata + JSON-LD.
 */
export function CourseDetail() {
  const { slug } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!slug) return;

    getCourseBySlug(slug as string)
      .then(setCourse)
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && course) {
        const enrollment = await getEnrollment(user.uid, course.id);
        setEnrollmentStatus(enrollment ? enrollment.status : null);

        const isComplete = await isProfileComplete(user);
        if (!isComplete && !window.location.pathname.startsWith('/dashboard/profile')) {
          router.push('/dashboard/profile');
        }
      }
    });

    return () => unsubscribe();
  }, [course, router]);

  const handleRequest = async () => {
    setError("");
    setMessage("");

    if (!currentUser) {
      router.push("/auth");
      return;
    }
    if (!course) {
      setError("Course not found.");
      return;
    }

    setIsProcessing(true);
    try {
      await requestEnrollment(currentUser.uid, course.id);
      setEnrollmentStatus("pending");
      setMessage("Enrollment request sent. You'll get access once an admin approves it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send request at this time.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading course...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <main className="relative min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-28 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Course not found</h1>
          <p className="mt-4 text-slate-600">This course may have been removed or the link is invalid.</p>
          <Link href="/courses" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-white">
            Back to Catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
             <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-secondary">Course</p>
                <h1 className="text-4xl font-bold text-slate-900">{course.title}</h1>
                <p className="text-slate-600">{course.description}</p>
              </div>
             <div className="space-y-4">
               <div className="rounded-3xl bg-slate-50 p-6">
                 <p className="text-sm text-slate-500">Price</p>
                 <p className="mt-2 text-3xl font-semibold text-slate-900">₹{course.price}</p>
               </div>
               <div className="rounded-3xl bg-slate-50 p-6">
                 <p className="text-sm text-slate-500">Status</p>
                 <p className="mt-2 text-slate-900">{course.published ? "Published" : "Draft"}</p>
               </div>
             </div>
           </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            {error && <div className="mb-4 rounded-2xl bg-red-100 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
            {message && <div className="mb-4 rounded-2xl bg-emerald-100 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{message}</div>}

              {enrollmentStatus === "approved" ? (
                <Button className="w-full" onClick={() => router.push(`/courses/${course.slug}/learn`)}>
                  Go to Course
                </Button>
              ) : enrollmentStatus === "pending" ? (
                <Button className="w-full" disabled>
                  Request Pending Approval
                </Button>
              ) : enrollmentStatus === "rejected" ? (
                <Button className="w-full" onClick={handleRequest} disabled={isProcessing}>
                  {isProcessing ? "Sending..." : "Request Again"}
                </Button>
              ) : (
                <Button className="w-full" onClick={handleRequest} disabled={isProcessing}>
                  {isProcessing ? "Sending..." : "Request Access"}
                </Button>
              )}

            <div className="mt-6 text-sm text-slate-600">
              {currentUser
                ? (enrollmentStatus === "approved"
                  ? "You have access to this course."
                  : "Submit a request and an admin will approve your access.")
                : "Sign in or sign up to request access."}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}