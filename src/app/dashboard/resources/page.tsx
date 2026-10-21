"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getEnrollmentsForUser,
  getCourseById,
  getVisibleResourcePage,
  getCourseResourceCounts,
  getCourseFlashcards,
  getResourceProgress,
  emptyResourceProgress,
  setResourceViewed,
  setFlashcardStudyState,
  setLastStudiedCard,
  type ResourcePageCursor,
} from "@/lib/course";
import type { Course, CourseContentItem, FlashcardStudyStatus, ResourceProgress } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { PdfViewerDialog, isPdfUrl, type PdfViewerState } from "@/components/resources/pdf-viewer-dialog";
import { ResourceList } from "@/components/resources/resource-list";
import { FlashcardDeckCard } from "@/components/resources/flashcard-deck-card";
import { StudySession, type StudyCard } from "@/components/resources/study-session";

const PAGE_SIZE = 25;

/** A course section header — cheap to build (no document reads, only counts). */
interface CourseSection {
  course: Course;
  totalResources: number;
  flashcardCount: number;
}

interface CourseResourceCounts {
  total: number;
  flashcards: number;
}

interface CourseListState {
  resources: CourseContentItem[];
  nextCursor: ResourcePageCursor | null;
  loading: boolean;
  loaded: boolean;
  /** Set when the initial page fetch failed; triggers the retry UI. */
  error: string | null;
}

interface StudyLaunch {
  courseId: string;
  courseTitle: string;
  cards: StudyCard[];
  startIndex: number;
  reviewOnly: boolean;
}

function emptyListState(): CourseListState {
  return { resources: [], nextCursor: null, loading: false, loaded: false, error: null };
}

export default function ResourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion state: resources are fetched per course on expand, never all at
  // once — a course with thousands of flashcards costs a couple of count
  // queries on page load, and full document reads only when opened.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [listState, setListState] = useState<Record<string, CourseListState>>({});
  const [progressByCourse, setProgressByCourse] = useState<Record<string, ResourceProgress>>({});
  const [study, setStudy] = useState<StudyLaunch | null>(null);
  const [preparingCourse, setPreparingCourse] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<PdfViewerState | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }

      setUser(currentUser);

      try {
        const userEnrollments = await getEnrollmentsForUser(currentUser.uid);
        // Only approved enrollments grant access to course resources —
        // pending/rejected requests must not surface course materials
        // (mirrors the gating on the my-courses page).
        const approvedEnrollments = userEnrollments.filter(
          (enrollment) => enrollment.status === "approved",
        );

        const courseResults = await Promise.allSettled(
          approvedEnrollments.map((enrollment) => getCourseById(enrollment.courseId)),
        );
        const courses = courseResults
          .filter((result): result is PromiseFulfilledResult<Course | null> =>
            result.status === "fulfilled" && result.value !== null)
          .map((result) => result.value as Course);

        setSections(courses.map((course) => ({ course, totalResources: 0, flashcardCount: 0 })));

        // Cheap server-side counts per course (no document reads) so every
        // collapsed section can show its size + deck entry point instantly.
        const countResults = await Promise.allSettled(courses.map((course) => getCourseResourceCounts(course.id)));
        setSections((prev) =>
          prev.map((section, index) => {
            const result = countResults[index];
            if (result.status !== "fulfilled") return section;
            // result.value is { total, flashcards } from getCourseResourceCounts;
            // the section speaks totalResources / flashcardCount — map explicitly.
            const counts: CourseResourceCounts = result.value;
            return {
              ...section,
              totalResources: counts.total,
              flashcardCount: counts.flashcards,
            };
          }),
        );
      } catch (err) {
        console.error("Error loading resources:", err);
        setError("Failed to load resources. Please try again later.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  /** Applies an optimistic local progress change (reverted on write failure). */
  const updateProgress = useCallback(
    (courseId: string, mutate: (p: ResourceProgress) => ResourceProgress) => {
      setProgressByCourse((prev) => {
        const current = prev[courseId] ?? {
          id: `${user?.uid ?? ""}_${courseId}`,
          userId: user?.uid ?? "",
          courseId,
          viewedResourceIds: {},
          flashcardStates: {},
          lastStudiedCardId: null,
          lastStudiedAt: null,
          updatedAt: null,
        };
        return { ...prev, [courseId]: mutate(current) };
      });
    },
    [user],
  );

  /** Fetches a course's first page + progress; also used by the retry button. */
  const loadCourse = useCallback(
    async (courseId: string) => {
      if (!user) return;
      const uid = user.uid;
      setListState((prev) => ({ ...prev, [courseId]: { ...emptyListState(), loading: true } }));
      try {
        // 1. Load resources first (critical path — always succeeds or errors).
        // Flashcard-only courses skip the page query entirely: scanning the
        // collection just to skip every card would read the whole deck (e.g.
        // 1,160 flashcards) for an empty material list.
        const section = sections.find((s) => s.course.id === courseId);
        const knownMaterials = section ? Math.max(section.totalResources - section.flashcardCount, 0) : 0;
        const flashcardOnly = Boolean(section && section.totalResources > 0 && knownMaterials === 0);
        const page = flashcardOnly
          ? { resources: [] as CourseContentItem[], nextCursor: null }
          : await getVisibleResourcePage(courseId, PAGE_SIZE);

        // 2. Load progress best-effort — never gating the list on it
        try {
          const progress = await getResourceProgress(uid, courseId);
          setProgressByCourse((prev) => ({ ...prev, [courseId]: progress }));
        } catch (err) {
          console.warn(`Failed to load progress for course ${courseId}:`, err);
          // Fall back to an empty state so the deck card and checklist still
          // render (a brand-new account may have no progress doc yet).
          setProgressByCourse((prev) => ({ ...prev, [courseId]: emptyResourceProgress(uid, courseId) }));
        }

        // 3. Always mark list as loaded
        setListState((prev) => ({
          ...prev,
          [courseId]: {
            resources: page.resources,
            nextCursor: page.nextCursor,
            loading: false,
            loaded: true,
            error: null,
          },
        }));
      } catch (err) {
        console.error("Error loading course resources:", err);
        // Surface the failure instead of leaving the section on a spinner.
        setListState((prev) => ({
          ...prev,
          [courseId]: { ...emptyListState(), loaded: true, error: "Failed to load materials. Please try again." },
        }));
      }
    },
    [sections, user],
  );

  const toggleCourse = useCallback(
    async (courseId: string) => {
      if (!user) return;
      const next = new Set(expanded);
      if (next.has(courseId)) {
        next.delete(courseId);
        setExpanded(next);
        return;
      }
      next.add(courseId);
      setExpanded(next);

      const existing = listState[courseId];
      if (existing?.loaded || existing?.loading) return;
      await loadCourse(courseId);
    },
    [expanded, listState, loadCourse, user],
  );

  const loadMore = useCallback(
    async (courseId: string) => {
      const state = listState[courseId];
      if (!user || !state?.loaded || state.loading || !state.nextCursor) return;
      setListState((prev) => ({ ...prev, [courseId]: { ...state, loading: true } }));
      try {
        const page = await getVisibleResourcePage(courseId, PAGE_SIZE, state.nextCursor);
        setListState((prev) => ({
          ...prev,
          [courseId]: {
            resources: [...(prev[courseId]?.resources ?? []), ...page.resources],
            nextCursor: page.nextCursor,
            loading: false,
            loaded: true,
            error: null,
          },
        }));
      } catch (err) {
        console.error("Error loading more resources:", err);
        setListState((prev) => ({ ...prev, [courseId]: { ...prev[courseId], loading: false } }));
      }
    },
    [listState, user],
  );

  const toggleViewed = useCallback(
    (courseId: string, resourceId: string, viewed: boolean) => {
      if (!user) return;
      const previous = progressByCourse[courseId];
      updateProgress(courseId, (p) => {
        const viewedResourceIds = { ...p.viewedResourceIds };
        if (viewed) viewedResourceIds[resourceId] = true;
        else delete viewedResourceIds[resourceId];
        return { ...p, viewedResourceIds };
      });
      setResourceViewed(user.uid, courseId, resourceId, viewed)
        .then((next) => setProgressByCourse((prev) => ({ ...prev, [courseId]: next })))
        .catch((err) => {
          console.error("Failed to save resource state:", err);
          if (previous) setProgressByCourse((prev) => ({ ...prev, [courseId]: previous }));
        });
    },
    [progressByCourse, updateProgress, user],
  );

  const handleFlashcardState = useCallback(
    (courseId: string, resourceId: string, state: FlashcardStudyStatus) => {
      if (!user) return;
      const previous = progressByCourse[courseId];
      updateProgress(courseId, (p) => ({
        ...p,
        flashcardStates: { ...p.flashcardStates, [resourceId]: state },
      }));
      setFlashcardStudyState(user.uid, courseId, resourceId, state)
        .then((next) => setProgressByCourse((prev) => ({ ...prev, [courseId]: next })))
        .catch((err) => {
          console.error("Failed to save flashcard state:", err);
          if (previous) setProgressByCourse((prev) => ({ ...prev, [courseId]: previous }));
        });
    },
    [progressByCourse, updateProgress, user],
  );

  const handlePositionChange = useCallback(
    (courseId: string, cardId: string) => {
      if (!user) return;
      // Optimistic only — the server write may carry a timestamp sentinel we
      // must not route back into client state.
      updateProgress(courseId, (p) => ({ ...p, lastStudiedCardId: cardId }));
      setLastStudiedCard(user.uid, courseId, cardId).catch((err) =>
        console.error("Failed to save study position:", err),
      );
    },
    [updateProgress, user],
  );

  const startStudy = useCallback(
    async (courseId: string, courseTitle: string, mode: "all" | "review") => {
      if (!user || preparingCourse) return;
      const uid = user.uid;
      setPreparingCourse(courseId);
      try {
        const flashcards = await getCourseFlashcards(courseId);
        // Progress only supplies the resume pointer — a failed read (offline,
        // missing document, rules denial) must never block studying.
        const progress =
          progressByCourse[courseId] ??
          (await getResourceProgress(uid, courseId).catch((err) => {
            console.warn(`Failed to load progress for course ${courseId}:`, err);
            return emptyResourceProgress(uid, courseId);
          }));
        const cards: StudyCard[] = flashcards.map((f) => ({
          resourceId: f.id,
          front: f.front.trim() || "(empty card — content missing)",
          back: f.back.trim() || "(empty card — content missing)",
          title: f.title,
        }));
        if (cards.length === 0) {
          // Counts can include malformed legacy cards that the type guard in
          // getCourseFlashcards drops — tell the student instead of doing
          // nothing at all when they press "Start studying".
          setError("This course has no studyable flashcards yet. Please check back soon.");
          return;
        }

        // Resume where the student left off (ordered sessions only).
        let startIndex = 0;
        if (mode === "all" && progress.lastStudiedCardId) {
          const index = cards.findIndex((c) => c.resourceId === progress.lastStudiedCardId);
          if (index >= 0) startIndex = index;
        }
        setStudy({ courseId, courseTitle, cards, startIndex, reviewOnly: mode === "review" });
      } catch (err) {
        console.error("Error preparing study session:", err);
        setError("Failed to prepare the study session. Please try again.");
      } finally {
        setPreparingCourse(null);
      }
    },
    [preparingCourse, progressByCourse, user],
  );

  const handleResourceClick = useCallback((url?: string, title?: string) => {
    if (!url) return;
    // PDFs open in the custom in-app reader window; everything else keeps
    // opening in a new tab. "noopener,noreferrer" blocks reverse tabnabbing
    // — resource URLs are admin-provided but may point anywhere.
    if (isPdfUrl(url)) {
      setPdfViewer({ url, title: title || "Document" });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <p className="text-lg text-slate-600 dark:text-zinc-400">Loading resources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <main className="relative min-h-screen bg-slate-50 dark:bg-zinc-950">
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
    <main className="relative min-h-screen bg-slate-50 dark:bg-zinc-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-zinc-100">Study Resources</h1>
          <p className="mt-4 text-slate-600 dark:text-zinc-400">
            Access study materials for your enrolled courses. Open a course to load its materials, mark them
            as done, and study flashcard decks with progress tracking and resume support.
          </p>
        </div>

        {sections.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-slate-600 dark:text-zinc-400">
                You haven&apos;t enrolled in any courses yet.
              </p>
              <Button className="mt-4" onClick={() => router.push("/dashboard/available-courses")}>
                Browse Available Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => {
              const courseId = section.course.id;
              const materialsTotal = Math.max(section.totalResources - section.flashcardCount, 0);
              const progress = progressByCourse[courseId];
              const viewedCount = progress ? Object.keys(progress.viewedResourceIds).length : 0;
              const list = listState[courseId];
              const isExpanded = expanded.has(courseId);
              return (
                <Card key={courseId}>
                  <CardHeader>
                    <button
                      type="button"
                      onClick={() => toggleCourse(courseId)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <span className="truncate">{section.course.title}</span>
                          <Badge variant="default">Course</Badge>
                        </CardTitle>
                        <p className="mt-1 line-clamp-2 text-sm font-normal text-slate-500 dark:text-zinc-400">
                          {section.course.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden text-xs text-slate-500 dark:text-zinc-400 sm:block">
                          {materialsTotal > 0
                            ? `${materialsTotal} material${materialsTotal === 1 ? "" : "s"}`
                            : ""}
                          {materialsTotal > 0 && section.flashcardCount > 0 ? " • " : ""}
                          {section.flashcardCount > 0
                            ? `${section.flashcardCount} flashcard${section.flashcardCount === 1 ? "" : "s"}`
                            : ""}
                          {materialsTotal === 0 && section.flashcardCount === 0 ? "No resources yet" : ""}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                        )}
                      </div>
                    </button>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent>
                      {list?.error ? (
                        <div className="py-6 text-sm text-red-600 dark:text-red-400">
                          <p>{list.error}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => {
                              void loadCourse(courseId);
                            }}
                          >
                            Retry
                          </Button>
                        </div>
                      ) : !list?.loaded ? (
                        <div className="flex items-center gap-2 py-6 text-sm text-slate-500 dark:text-zinc-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading resources…
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Whole flashcard deck collapsed into one entry —
                              never rendered as thousands of individual rows. */}
                          {section.flashcardCount > 0 && (
                            <FlashcardDeckCard
                              flashcardCount={section.flashcardCount}
                              states={progress?.flashcardStates ?? {}}
                              hasResume={Boolean(progress?.lastStudiedCardId)}
                              preparing={preparingCourse === courseId}
                              onStart={(mode) => startStudy(courseId, section.course.title, mode)}
                            />
                          )}

                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
                              Study Materials
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-zinc-400">
                              {materialsTotal > 0 ? `${viewedCount} / ${materialsTotal} marked done` : ""}
                            </span>
                          </div>
                          <ResourceList
                            resources={list.resources}
                            viewedIds={progress?.viewedResourceIds ?? {}}
                            loadingMore={Boolean(list.loading)}
                            hasMore={Boolean(list.nextCursor)}
                            onLoadMore={() => loadMore(courseId)}
                            onToggleViewed={(resourceId, viewed) => toggleViewed(courseId, resourceId, viewed)}
                            onOpenUrl={handleResourceClick}
                            emptyMessage={
                              materialsTotal === 0 && section.flashcardCount > 0
                                ? "This course is flashcards-only — start a study session from the deck above."
                                : undefined
                            }
                          />
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {study && (
        <StudySession
          courseTitle={study.courseTitle}
          cards={study.cards}
          states={progressByCourse[study.courseId]?.flashcardStates ?? {}}
          startIndex={study.startIndex}
          reviewOnly={study.reviewOnly}
          onStateChange={(resourceId, state) => handleFlashcardState(study.courseId, resourceId, state)}
          onPositionChange={(resourceId) => handlePositionChange(study.courseId, resourceId)}
          onClose={() => setStudy(null)}
        />
      )}

      {/* Custom PDF reader window */}
      <PdfViewerDialog pdf={pdfViewer} onClose={() => setPdfViewer(null)} />
    </main>
  );
}