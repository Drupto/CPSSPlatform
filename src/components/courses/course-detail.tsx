"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getPublishedCourseBySlug,
  getCourseBySlug,
  getEnrollment,
  getUserProfile,
  isAdminProfile,
} from "@/lib/course";
import { formatInr, formatUsd } from "@/lib/currency";
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
  const [authResolved, setAuthResolved] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | null>(null);

  useEffect(() => {
    if (!slug || !authResolved) return;
    const slugStr = slug as string;

    const loadCourse = async () => {
      try {
        // Rules-compliant for non-admins: getCourseBySlug's query (no published
        // filter) is rejected under rules v2 for students/anonymous visitors.
        const published = await getPublishedCourseBySlug(slugStr);
        if (published) {
          setCourse(published);
          return;
        }

        // The course is not published (or was removed). Admins may still
        // preview DRAFT courses here — "View Course" from the admin course
        // list must not dead-end on "Course not found" for unpublished
        // drafts. The unrestricted slug query is only safe for admins.
        if (currentUser) {
          const profile = await getUserProfile(currentUser.uid);
          if (isAdminProfile(profile)) {
            const draftCourse = await getCourseBySlug(slugStr).catch(() => null);
            setCourse(draftCourse);
            return;
          }
        }

        setCourse(null);
      } catch {
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [slug, authResolved, currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthResolved(true);
      if (!user || !course) return;

      // Admins review courses without enrolling — skip the student gates
      // (enrollment lookup and the profile-completion redirect) so the
      // preview flow is never hijacked to /dashboard/profile.
      const profile = await getUserProfile(user.uid);
      if (isAdminProfile(profile)) {
        setEnrollmentStatus(null);
        return;
      }

      const enrollment = await getEnrollment(user.uid, course.id);
      setEnrollmentStatus(enrollment ? enrollment.status : null);

      const isComplete = await isProfileComplete(user);
      if (!isComplete && !window.location.pathname.startsWith('/dashboard/profile')) {
        router.push('/dashboard/profile');
      }
    });

    return () => unsubscribe();
  }, [course, router]);

  // All enrollment requests go through the payment page: the student scans
  // the UPI/PayPal QR and submits the transaction reference there.
  const handleRequest = () => {
    if (!currentUser) {
      router.push("/auth");
      return;
    }
    if (!course) return;
    router.push(`/courses/${course.slug}/pay`);
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
                 <p className="text-sm text-slate-500">Price (INR — paid via UPI)</p>
                 <p className="mt-2 text-3xl font-semibold text-slate-900">{formatInr(course.price)}</p>
                 {course.priceUsd != null && (
                   <p className="mt-1 text-lg font-semibold text-slate-700">
                     {formatUsd(course.priceUsd)} <span className="text-xs font-normal text-slate-500">(USD — paid via PayPal)</span>
                   </p>
                 )}
               </div>
               <div className="rounded-3xl bg-slate-50 p-6">
                 <p className="text-sm text-slate-500">Status</p>
                 <p className="mt-2 text-slate-900">{course.published ? "Published" : "Draft"}</p>
               </div>
             </div>
           </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              {enrollmentStatus === "approved" ? (
                <Button className="w-full" onClick={() => router.push(`/courses/${course.slug}/learn`)}>
                  Go to Course
                </Button>
              ) : enrollmentStatus === "pending" ? (
                <Button className="w-full" disabled>
                  Request Pending Approval
                </Button>
              ) : enrollmentStatus === "rejected" ? (
                <Button className="w-full" onClick={handleRequest}>
                  Request Again
                </Button>
              ) : (
                <Button className="w-full" onClick={handleRequest}>
                  Request Access
                </Button>
              )}

            <div className="mt-6 text-sm text-slate-600">
              {currentUser
                ? (enrollmentStatus === "approved"
                  ? "You have access to this course."
                  : enrollmentStatus === "pending"
                    ? "Your payment details are awaiting admin verification."
                    : "You'll be taken to the payment page to complete your enrollment.")
                : "Sign in or sign up to request access."}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}