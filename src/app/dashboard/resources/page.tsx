"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getEnrollmentsForUser, getCourseById, getCourseResources } from "@/lib/course";
import { isFlashcard } from "@/lib/types";
import type { Course, CourseContentItem, Enrollment } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FileText,
  Video,
  ExternalLink,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Play,
  Sparkles,
  RotateCcw,
  Brain,
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
      .map(r => {
        // Legacy flashcards may be missing front/back (backfilled by
        // scripts/backfill-flashcards.mjs); degrade gracefully in the UI.
        const content = isFlashcard(r) ? r : null;
        return {
          resourceId: r.id,
          front: content?.front.trim() || "(empty card — content missing)",
          back: content?.back.trim() || "(empty card — content missing)",
          title: r.title,
        };
      });
    if (cards.length === 0) return;
    setStudyState({
      courseId,
      courseTitle,
      cards,
      currentIndex: 0,
      isFlipped: false,
    });
  };

  const closeStudyMode = useCallback(() => setStudyState(null), []);

  const flipCard = useCallback(() => {
    setStudyState(prev => (prev ? { ...prev, isFlipped: !prev.isFlipped } : null));
  }, []);

  const goNext = useCallback(() => {
    setStudyState(prev => {
      if (!prev) return null;
      const next = prev.currentIndex < prev.cards.length - 1 ? prev.currentIndex + 1 : 0;
      return { ...prev, currentIndex: next, isFlipped: false };
    });
  }, []);

  const goPrev = useCallback(() => {
    setStudyState(prev => {
      if (!prev) return null;
      const prevIndex = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.cards.length - 1;
      return { ...prev, currentIndex: prevIndex, isFlipped: false };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!studyState || e.repeat) return;
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

  const currentCard = studyState?.cards[studyState.currentIndex];
  const progressValue = studyState
    ? ((studyState.currentIndex + 1) / studyState.cards.length) * 100
    : 0;

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
                            role={resource.type === "flashcard" ? "button" : undefined}
                            tabIndex={resource.type === "flashcard" ? 0 : undefined}
                            aria-label={resource.type === "flashcard" ? `Study flashcards for ${course.title}` : undefined}
                            onClick={resource.type === "flashcard" ? () => openStudyMode(course.id, course.title, resources) : undefined}
                            onKeyDown={(e) => {
                              // Guard: while the study overlay is open this row may
                              // still hold focus — Space/Enter must not re-open
                              // (and reset) the session.
                              if (studyState) return;
                              if (resource.type === "flashcard" && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                openStudyMode(course.id, course.title, resources);
                              }
                            }}
                            className={`border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors ${
                              resource.type === "flashcard" ? "cursor-pointer" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {getResourceIcon(resource.type)}
                                <div>
                                  <h3 className="font-medium text-slate-900">{resource.title}</h3>
                                  {resource.type === "flashcard" ? (
                                    <p className="text-sm text-slate-500 mt-1">
                                      {isFlashcard(resource) ? resource.front : ""}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500" />
            <div className="relative p-4 sm:p-6 md:p-8 lg:p-10">
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                    <Brain className="h-4 w-4" />
                    Study Session
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Flashcard Review</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {studyState.courseTitle} • Card {studyState.currentIndex + 1} of {studyState.cards.length}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                    {studyState.cards.length} cards
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeStudyMode} className="rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
                  <span>Progress</span>
                  <span>{Math.round(progressValue)}%</span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-3 shadow-inner sm:p-4">
                <div className="perspective-1000">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={studyState.isFlipped}
                    aria-label={`Flashcard ${studyState.currentIndex + 1} of ${studyState.cards.length}: ${currentCard?.title ?? ""}`}
                    className={`flip-card-3d relative h-[320px] w-full cursor-pointer select-none rounded-[20px] shadow-lg transition-transform duration-700 sm:h-[380px] ${
                      studyState.isFlipped ? "rotate-y-180" : ""
                    }`}
                    onClick={flipCard}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        flipCard();
                      }
                    }}
                  >
                    <div className="card-face rounded-[20px] border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-6 sm:p-8">
                      <div className="text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Front
                        </p>
                        <p className="mt-3 text-lg font-semibold text-slate-900 sm:text-2xl">
                          {currentCard?.front}
                        </p>
                        <p className="mt-4 text-sm text-slate-500">
                          {currentCard?.title}
                        </p>
                      </div>
                    </div>

                    <div className="card-face rotate-y-180 rounded-[20px] border border-indigo-500/30 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white sm:p-8">
                      <div className="text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white">
                          <RotateCcw className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                          Back
                        </p>
                        <p className="mt-3 text-lg font-semibold sm:text-2xl">
                          {currentCard?.back}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">Tap card to flip</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">Space / Arrow keys</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={goPrev} className="gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button onClick={flipCard} className="gap-2">
                    <Play className="h-4 w-4" />
                    {studyState.isFlipped ? "Show Front" : "Show Back"}
                  </Button>
                  <Button variant="outline" onClick={goNext} className="gap-2">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
