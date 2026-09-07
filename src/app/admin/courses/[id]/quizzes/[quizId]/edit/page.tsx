"use client";


import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { 
  getCourseById,
  getUserProfile,
  isAdminProfile,
  getQuizById,
  updateQuiz,
  getCourseQuizzes,
} from "@/lib/course";
import type { Course, Quiz } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit2, BarChart3 } from "lucide-react";
import { QuizForm } from "@/components/admin/quizzes/QuizForm";

export default function EditQuizPage() {
  const { id: courseId, quizId } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [existingQuizzes, setExistingQuizzes] = useState<Quiz[]>([]);
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
        
        if (!quizId) {
          setError("Quiz ID not found");
          setLoading(false);
          return;
        }

        const quizData = await getQuizById(quizId as string, courseId as string);
        if (!quizData) {
          setError("Quiz not found");
          setLoading(false);
          return;
        }
        
        setQuiz(quizData);

        const quizzes = await getCourseQuizzes(courseId as string);
        setExistingQuizzes(quizzes.filter(q => q.id !== quizId));
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading course:", err);
        setError("Failed to load course data");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [courseId, quizId, router]);

  const handleSave = async (quizData: Partial<Quiz>) => {
    if (!courseId || !quizId) {
      setError("Course or Quiz ID not found");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateQuiz(courseId as string, quizId as string, {
        title: quizData.title,
        description: quizData.description,
        passPercentage: quizData.passPercentage,
        questions: quizData.questions,
        maxAttempts: quizData.maxAttempts,
        timeLimit: quizData.timeLimit,
        randomizeQuestionOrder: quizData.randomizeQuestionOrder,
        randomizeAnswerOrder: quizData.randomizeAnswerOrder
      });

      setSuccess("Quiz updated successfully!");

      setTimeout(() => {
        router.push(`/admin/courses/${courseId}/quizzes`);
      }, 1500);
    } catch (err) {
      console.error("Error saving quiz:", err);
      setError("Failed to save quiz. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-red-100 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-700">{error}</p>
          <Button className="mt-4" onClick={() => router.push(`/admin/courses/${courseId}/quizzes`)}>
            Back to Analytics
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
          <BackToAdminButton />
          <Button 
            variant="outline" 
            onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
            className="mb-4"
          >
            ← Back to Course
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Edit Quiz
          </h1>
          <p className="text-slate-600">
            Editing quiz for {course?.title}
          </p>
        </div>

        {success && (
          <div className="mb-6 rounded-2xl bg-emerald-100 border border-emerald-200 px-4 py-3 text-emerald-700">
            {success}
          </div>
        )}

        <ExistingQuizzesSection 
          quizzes={existingQuizzes} 
          currentQuizId={quizId as string} 
          courseId={courseId as string}
        />

        <QuizForm
          mode="edit"
          courseId={courseId as string}
          quizId={quizId as string}
          initialQuiz={quiz || undefined}
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

interface ExistingQuizzesSectionProps {
  quizzes: Quiz[];
  currentQuizId: string;
  courseId: string;
}

function ExistingQuizzesSection({ quizzes, currentQuizId, courseId }: ExistingQuizzesSectionProps) {
  const router = useRouter();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Existing Quizzes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quizzes.map((existingQuiz) => (
            <div 
              key={existingQuiz.id}
              className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                existingQuiz.id === currentQuizId 
                  ? "border-primary bg-primary/5" 
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">{existingQuiz.title}</h3>
                <p className="text-sm text-slate-600">
                  {existingQuiz.questions.length} question{existingQuiz.questions.length !== 1 ? 's' : ''}
                  {existingQuiz.description && ` • ${existingQuiz.description}`}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant={existingQuiz.id === currentQuizId ? "default" : "outline"}
                  size="sm"
                  onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${existingQuiz.id}/edit`)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${existingQuiz.id}`)}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}