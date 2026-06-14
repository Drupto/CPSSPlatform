"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getCourseById,
  getUserProfile,
  isAdminProfile,
  createQuiz,
} from "@/lib/course";
import type { Course, Quiz } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { QuizForm } from "@/components/admin/quizzes/QuizForm";

export default function CreateQuizPage() {
  const { id: courseId } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

      if (!courseId) {
        setError("Course ID not found");
        setLoading(false);
        return;
      }

      try {
        const courseData = await getCourseById(courseId as string);
        if (!courseData) {
          setError("Course not found");
          setLoading(false);
          return;
        }

        setCourse(courseData);
        setLoading(false);
      } catch (err) {
        console.error("Error loading course:", err);
        setError("Failed to load course data");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [courseId, router]);

  const handleSave = async (quizData: Partial<Quiz>) => {
    if (!courseId) {
      setError("Course ID not found");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const quizId = await createQuiz(courseId as string, quizData);
      setSuccess("Quiz created successfully!");

      setTimeout(() => {
        router.push(`/admin/courses/${courseId}/quizzes/${quizId}/edit`);
      }, 1500);
    } catch (err) {
      console.error("Error creating quiz:", err);
      setError("Failed to create quiz. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading quiz form...</p>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-red-100 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-700">{error}</p>
          <Button className="mt-4" onClick={() => router.push("/admin/courses")}>
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
            className="mb-4"
          >
            ← Back to Course
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Create Quiz
          </h1>
          <p className="text-slate-600">
            Create a new quiz for {course?.title}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-100 border border-red-200 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl bg-emerald-100 border border-emerald-200 px-4 py-3 text-emerald-700">
            {success}
          </div>
        )}

        <QuizForm
          mode="create"
          courseId={courseId as string}
          onSave={handleSave}
          isSaving={isSaving}
        />

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/courses/${courseId}/quizzes`)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </main>
  );
}
