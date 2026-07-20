"use client";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAllCourses, getUserProfile, isAdminProfile, deleteCourse, getCourseQuizzes } from "@/lib/course";
import type { Course, Quiz } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Navbar } from "@/components/navbar";

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseQuizzes, setCourseQuizzes] = useState<Record<string, Quiz[]>>({});
  const [loading, setLoading] = useState(true);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }

      const profile = await getUserProfile(currentUser.uid);
      if (!isAdminProfile(profile)) {
        router.push("/");
        return;
      }

      const loaded = await getAllCourses();
      setCourses(loaded);
      
      // Fetch quizzes for each course
      const quizzesMap: Record<string, Quiz[]> = {};
      await Promise.all(loaded.map(async (course) => {
        const quizzes = await getCourseQuizzes(course.id);
        quizzesMap[course.id] = quizzes;
      }));
      setCourseQuizzes(quizzesMap);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-24">
        <BackToAdminButton />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Course Management</h1>
              <p className="text-slate-600">All courses and their publication status.</p>
            </div>
            <Button onClick={() => router.push("/admin/courses/new")}>Create New Course</Button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
              No courses have been created yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {courses.map((course) => {
                const hasQuizzes = courseQuizzes[course.id]?.length > 0;
                const firstQuizId = courseQuizzes[course.id]?.[0]?.id || '';
                return (
                  <div key={course.id} className="rounded-3xl border border-slate-200 bg-white p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{course.title}</h2>
                        <p className="text-slate-500">ID: {course.id}</p>
                        <p className="text-slate-500">Slug: {course.slug}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                        <span className={course.published ? "rounded-full bg-emerald-100 px-3 py-1 text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-slate-600"}>
                          {course.published ? "Published" : "Draft"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">₹{course.price}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Link href={`/courses/${course.slug}`} className="text-primary hover:underline text-sm">View Course</Link>
                      <Link href={`/admin/courses/${course.id}/edit`} className="text-slate-600 hover:text-slate-900 text-sm">Edit Course</Link>
                      <Link href={`/admin/courses/${course.id}/quizzes`} className="text-slate-600 hover:text-slate-900 text-sm">Quiz Analytics</Link>
                      <Link href={`/admin/courses/${course.id}/analytics`} className="text-slate-600 hover:text-slate-900 text-sm">Course Analytics</Link>
                      <Link href={`/admin/courses/${course.id}/quizzes/new`} className="text-slate-600 hover:text-slate-900 text-sm">Add Quiz</Link>
                      <Link 
                        href={hasQuizzes ? `/admin/courses/${course.id}/quizzes/${firstQuizId}/edit` : `/admin/courses/${course.id}/quizzes/new`} 
                        className={`text-sm ${hasQuizzes ? "text-slate-600 hover:text-slate-900" : "text-slate-400 pointer-events-none"}`}
                        aria-disabled={!hasQuizzes}
                        tabIndex={hasQuizzes ? 0 : -1}
                      >
                        Edit Quiz
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={() => setCourseToDelete(course.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{course.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setCourseToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={deleting}
                              onClick={async () => {
                                setDeleting(true);
                                try {
                                  await deleteCourse(course.id);
                                  setCourses((prev) => prev.filter((c) => c.id !== course.id));
                                } catch (err) {
                                  console.error("Failed to delete course:", err);
                                } finally {
                                  setDeleting(false);
                                  setCourseToDelete(null);
                                }
                              }}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              {deleting ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}