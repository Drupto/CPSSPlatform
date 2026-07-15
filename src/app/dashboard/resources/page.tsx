"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getEnrollmentsForUser, getCourseById, getCourseResources } from "@/lib/course";
import type { Course, CourseContentItem, Enrollment } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FileText,
  Link as LinkIcon,
  Video,
  ExternalLink,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Play,
} from "lucide-react";

interface FlashcardStudyState {
  courseId: string;
  courseTitle: string;
  cards: { resourceId: string; front: string; back: string; title: string }[];
  currentIndex: number;
  isFlipped: boolean;
}

export default function ResourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<{course: Course, resources: CourseContentItem[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyState, setStudyState] = useState<FlashcardStudyState | null>(null);

  const openStudyMode = (courseId: string, courseTitle: string, flashcards: CourseContentItem[]) => {
    const cards = flashcards
      .filter(r => r.type === "flashcard")
      .map(r => ({
        resourceId: r.id,
        front: (r as any).front || "",
        back: (r as any).back || "",
        title: r.title,
      }));
    if (cards.length === 0) return;
    setStudyState({
      courseId,
      courseTitle,
      cards,
      currentIndex: 0,
      isFlipped: false,
    });
  };

  const closeStudyMode = () => setStudyState(null);

  const flipCard = () => {
    setStudyState(prev => (prev ? { ...prev, isFlipped: !prev.isFlipped } : null));
  };

  const goNext = () => {
    setStudyState(prev => {
      if (!prev) return null;
      const next = prev.currentIndex < prev.cards.length - 1 ? prev.currentIndex + 1 : 0;
      return { ...prev, currentIndex: next, isFlipped: false };
    });
  };

  const goPrev = () => {
    setStudyState(prev => {
      if (!prev) return null;
      const prevIndex = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.cards.length - 1;
      return { ...prev, currentIndex: prevIndex, isFlipped: false };
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!studyState) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        flipCard();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        closeStudyMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [studyState, flipCard, goNext, goPrev]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }

      setUser(currentUser);

      try {
        const userEnrollments = await getEnrollmentsForUser(currentUser.uid);
        setEnrollments(userEnrollments);

        const coursePromises = userEnrollments.map(async (enrollment) => {
          const course = await getCourseById(enrollment.courseId);
          if (course) {
            const resources = await getCourseResources(enrollment.courseId);
            return { course, resources };
          }
          return null;
        });

        const courseResults = await Promise.allSettled(coursePromises);
        const validCourses = courseResults
          .filter(
            (result): result is PromiseFulfilledResult<{course: Course, resources: CourseContentItem[]}> =>
              result.status === "fulfilled" && result.value !== null
          )
          .map(result => result.value);

        setCourses(validCourses);
      } catch (err) {
        console.error("Error loading resources:", err);
        setError("Failed to load resources. Please try again later.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "link":
        return <ExternalLink className="h-5 w-5" />;
      case "flashcard":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case "document":
        return <Badge variant="secondary">Document</Badge>;
      case "video":
        return <Badge variant="secondary">Video</Badge>;
      case "link":
        return <Badge variant="secondary">Link</Badge>;
      case "flashcard":
        return <Badge variant="secondary">Flashcard</Badge>;
      default:
        return <Badge variant="secondary">Resource</Badge>;
    }
  };

  const getFlashcardCount = (resources: CourseContentItem[]) =>
    resources.filter(r => r.type === "flashcard").length;

  const handleResourceClick = (url?: string) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading resources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <main className="relative min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-28">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-red-600">{error}</p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900">Study Resources</h1>
          <p className="mt-4 text-slate-600">
            Access study materials and additional resources for your enrolled courses.
          </p>
        </div>

        {courses.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-slate-600">
                You haven&apos;t enrolled in any courses yet.
              </p>
              <Button className="mt-4" onClick={() => router.push("/dashboard/available-courses")}>
                Browse Available Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {courses.map(({ course, resources }) => (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{course.title}</span>
                    <Badge variant="default">Course</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">{course.description}</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Resources</h3>
                      {getFlashcardCount(resources) > 0 && (
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => openStudyMode(course.id, course.title, resources)}
                        >
                          <BookOpen className="h-4 w-4" />
                          Study Flashcards
                        </Button>
                      )}
                    </div>

                    {resources.length > 0 ? (
                      <div className="grid gap-3">
                        {resources.map((resource) => (
                          <div
                            key={resource.id}
                            className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {getResourceIcon(resource.type)}
                                <div>
                                  <h3 className="font-medium text-slate-900">{resource.title}</h3>
                                  {resource.type === "flashcard" ? (
                                    <p className="text-sm text-slate-500 mt-1">
                                      {(resource as any).front}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-slate-500 mt-1">{resource.body}</p>
                                  )}
                                  {getResourceTypeBadge(resource.type)}
                                </div>
                              </div>
                              {resource.url && resource.type !== "flashcard" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResourceClick(resource.url);
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  {resource.type === "document" ? "Download" : "Open"}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">
                        No resources available for this course yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {studyState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Study Flashcards</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {studyState.courseTitle} • Card {studyState.currentIndex + 1} of{" "}
                    {studyState.cards.length}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={closeStudyMode}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goPrev}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Progress
                  value={((studyState.currentIndex + 1) / studyState.cards.length) * 100}
                  className="h-2 flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goNext}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="perspective-1000">
                <div
                  className={`relative w-full bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-12 cursor-pointer select-none transition-transform duration-500 transform-style-3d ${
                    studyState.isFlipped ? "rotate-y-180" : ""
                  }`}
                  onClick={flipCard}
                  style={{ minHeight: "280px" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-3">
                        {studyState.isFlipped ? "Back" : "Front"}
                      </p>
                      <p className="text-xl md:text-2xl font-medium text-slate-900 leading-relaxed">
                        {studyState.isFlipped
                          ? studyState.cards[studyState.currentIndex].back
                          : studyState.cards[studyState.currentIndex].front}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 mt-6">
                <Button onClick={flipCard} size="lg" className="gap-2 px-8">
                  <Play className="h-4 w-4" />
                  {studyState.isFlipped ? "Show Front" : "Show Back"}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-400">
                <span>Space - Flip card</span>
                <span>← → - Navigate</span>
                <span>Esc - Close</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </main>
  );
}
