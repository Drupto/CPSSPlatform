"use client";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { addCourseContentItem, createCourse, createQuiz, getUserProfile, uploadCourseAsset, isAdminProfile } from "@/lib/course";
import type { Quiz } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/navbar";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { QuizForm } from "@/components/admin/quizzes/QuizForm";

interface ContentBlock {
  id: number;
  type: "text" | "video" | "document" | "quiz";
  title: string;
  body: string;
  url: string;
  file: File | null;
  order: number;
  /**
   * Only used while `type === "quiz"`: the quiz authored inline via the
   * QuizForm modal. It lives in client state until submit time because quiz
   * documents belong to `courses/{courseId}/quizzes` and the course (hence
   * the courseId) only exists once the form is submitted.
   */
  quizData?: Partial<Quiz>;
}

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  // priceUsd hidden from the form (INR/UPI-only) but kept so the doc write
  // below still sends priceUsd: null (Firestore rejects undefined).
  const [priceUsd] = useState("");
  const [published, setPublished] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([
    { id: 1, type: "text", title: "Introduction", body: "", url: "", file: null, order: 1 },
  ]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  // Block id whose quiz authoring modal is open (quiz-type blocks only).
  const [quizModalBlockId, setQuizModalBlockId] = useState<number | null>(null);
  const [isSavingQuizBlock, setIsSavingQuizBlock] = useState(false);

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

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const addContentBlock = () => {
    setContentBlocks((current) => [
      ...current,
      {
        id: Date.now(),
        type: "text",
        title: "New Section",
        body: "",
        url: "",
        file: null,
        order: current.length + 1,
      },
    ]);
  };

  // Adds a quiz block at the end of the stream — the admin then reorders it
  // with the ↑/↓ controls so it lands right after the content it should test.
  const addQuizBlock = () => {
    setContentBlocks((current) => [
      ...current,
      {
        id: Date.now(),
        type: "quiz",
        title: "Quiz",
        body: "",
        url: "",
        file: null,
        order: current.length + 1,
      },
    ]);
  };

  const handleQuizBlockSave = async (blockId: number, quiz: Partial<Quiz>) => {
    updateBlock(blockId, { quizData: quiz, title: quiz.title?.trim() || "Quiz" });
    setQuizModalBlockId(null);
    setIsSavingQuizBlock(false);
  };

  const updateBlock = (id: number, updates: Partial<ContentBlock>) => {
    setContentBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...updates } : block))
    );
  };

  const removeBlock = (id: number) => {
    setContentBlocks((current) => current.filter((block) => block.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setUploadProgress("");
    setIsSaving(true);

    try {
      if (!title.trim() || !description.trim()) {
        setError("Please enter a course title and description.");
        setIsSaving(false);
        return;
      }

      // Validate all video/document blocks have either a file or URL, and quiz
      // blocks have been fully authored (Firestore rules require >= 1 question
      // on every quiz document, so an empty quiz shell cannot be persisted).
      for (let i = 0; i < contentBlocks.length; i++) {
        const block = contentBlocks[i];
        if (block.type === "video" && !block.file && !block.url.trim()) {
          setError(`Section ${i + 1}: Video blocks require a video file upload or a URL.`);
          setIsSaving(false);
          return;
        }
        if (block.type === "document" && !block.file) {
          setError(`Section ${i + 1}: Document blocks require a file upload.`);
          setIsSaving(false);
          return;
        }
        if (block.type === "quiz" && (!block.quizData || !block.quizData.title?.trim() || !block.quizData.questions || block.quizData.questions.length === 0)) {
          setError(`Section ${i + 1}: Open the quiz editor and add at least one question before saving the course.`);
          setIsSaving(false);
          return;
        }
      }

      // STEP 1: Create a temporary course ID for file uploads
      // We create the course first because we need a courseId for the storage path
      setUploadProgress("Creating course document...");
      const courseId = await createCourse({
        title: title.trim(),
        slug: slug.trim() || title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        // Blank USD input → null (USD not configured), never undefined.
        priceUsd: priceUsd.trim() === "" ? null : Number(priceUsd),
        published,
        coverImageUrl: coverImageUrl.trim(),
      });

      // STEP 1.5: Create quiz documents for every quiz block. This must happen
      // after the course exists (quizzes live in courses/{courseId}/quizzes)
      // and before content items are written, because each quiz-type content
      // item stores the quizId it launches.
      const quizIdsByBlockId = new Map<number, string>();
      const quizBlockCount = contentBlocks.filter((block) => block.type === "quiz").length;
      if (quizBlockCount > 0) {
        let quizIndex = 0;
        for (const block of contentBlocks) {
          if (block.type !== "quiz" || !block.quizData) continue;
          quizIndex += 1;
          setUploadProgress(`Creating quiz ${quizIndex}/${quizBlockCount}...`);
          const quizId = await createQuiz(courseId, block.quizData);
          quizIdsByBlockId.set(block.id, quizId);
        }
      }

      // STEP 2: Upload all files and prepare content data
      setUploadProgress("Uploading media files...");
      const contentDataToSave = [];
      
      for (let i = 0; i < contentBlocks.length; i++) {
        const block = contentBlocks[i];
        let contentUrl = block.url;

        if ((block.type === "document" || block.type === "video") && block.file) {
          try {
            setUploadProgress(`Uploading ${block.type} for section ${i + 1}/${contentBlocks.length}...`);
            contentUrl = await uploadCourseAsset(block.file, courseId);
          } catch (uploadErr) {
            const errorMsg = uploadErr instanceof Error ? uploadErr.message : "Unknown error";
            console.error(`✗ Failed to upload ${block.type} for section ${i + 1}:`, errorMsg);
            throw new Error(
              `Failed to upload ${block.type} for section "${block.title}": ${errorMsg}. ` +
              `Make sure you have admin permissions and the file size is within limits. ` +
              `Check browser console for more details.`
            );
          }
        }

        contentDataToSave.push({
          type: block.type,
          title: block.title.trim() || "Untitled section",
          body: block.body.trim(),
          // Store the raw URL — the learn page sanitizes video URLs at render
          // time via getYouTubeEmbedUrl, so nothing unsafe is ever embedded.
          url: contentUrl.trim(),
          order: block.order,
          // Quiz blocks point at the quiz document created in STEP 1.5.
          ...(block.type === "quiz" && quizIdsByBlockId.has(block.id)
            ? { quizId: quizIdsByBlockId.get(block.id) }
            : {}),
        });
      }

      // STEP 3: Add all content items
      setUploadProgress("Saving course content...");
      for (let i = 0; i < contentDataToSave.length; i++) {
        const data = contentDataToSave[i];
        await addCourseContentItem(courseId, data);
      }

      setUploadProgress("");
      setMessage("Course created successfully. You can now view it in the admin course list.");
      setTimeout(() => router.push("/admin/courses"), 1200);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unable to create the course.";
      console.error("Course creation error:", err);
      setError(errorMsg);
      setUploadProgress("");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-800 dark:bg-zinc-950">
        <p className="text-lg text-slate-600 dark:text-zinc-400">Checking admin permissions...</p>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50 dark:bg-zinc-800 dark:bg-zinc-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-10 shadow-sm">
          <BackToAdminButton />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-100 mb-2">Create New Course</h1>
          <p className="text-slate-600 dark:text-zinc-400 mb-8">Build a course using structured sections and supporting assets.</p>

          {error && <div className="mb-6 rounded-2xl bg-red-100 border border-red-200 px-4 py-3 text-red-700">{error}</div>}
          {message && <div className="mb-6 rounded-2xl bg-emerald-100 border border-emerald-200 px-4 py-3 text-emerald-700">{message}</div>}
          {uploadProgress && <div className="mb-6 rounded-2xl bg-blue-100 border border-blue-200 px-4 py-3 text-blue-700">{uploadProgress}</div>}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course-title">Course Title</Label>
                <Input id="course-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-slug">Course Slug</Label>
                <Input
                  id="course-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="Optional: custom URL slug"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-description">Course Description</Label>
              <Textarea
                id="course-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="course-price">Price (₹ INR) — paid via UPI (KOTAK)</Label>
                <Input
                  id="course-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              </div>
              {/* USD/PayPal price hidden for now (INR + UPI/KOTAK only).
                  priceUsd state is kept so the data layer still writes
                  null (never undefined) with no migration needed. */}
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="course-cover">Cover Image URL</Label>
                <Input
                  id="course-cover"
                  value={coverImageUrl}
                  onChange={(event) => setCoverImageUrl(event.target.value)}
                  placeholder="Optional URL for course card image"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Course Content Sections</h2>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={addContentBlock}>
                    Add Section
                  </Button>
                  <Button type="button" variant="outline" onClick={addQuizBlock}>
                    Add Quiz
                  </Button>
                </div>
              </div>

              {contentBlocks.map((block) => (
                <div key={block.id} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Section {block.order}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const idx = contentBlocks.findIndex((b) => b.id === block.id);
                          if (idx > 0) {
                            const newBlocks = [...contentBlocks];
                            const temp = newBlocks[idx].order;
                            newBlocks[idx].order = newBlocks[idx - 1].order;
                            newBlocks[idx - 1].order = temp;
                            [newBlocks[idx], newBlocks[idx - 1]] = [newBlocks[idx - 1], newBlocks[idx]];
                            setContentBlocks(newBlocks);
                          }
                        }}
                        disabled={contentBlocks.findIndex((b) => b.id === block.id) === 0}
                        className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const idx = contentBlocks.findIndex((b) => b.id === block.id);
                          if (idx < contentBlocks.length - 1) {
                            const newBlocks = [...contentBlocks];
                            const temp = newBlocks[idx].order;
                            newBlocks[idx].order = newBlocks[idx + 1].order;
                            newBlocks[idx + 1].order = temp;
                            [newBlocks[idx], newBlocks[idx + 1]] = [newBlocks[idx + 1], newBlocks[idx]];
                            setContentBlocks(newBlocks);
                          }
                        }}
                        disabled={contentBlocks.findIndex((b) => b.id === block.id) === contentBlocks.length - 1}
                        className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <Button variant="ghost" className="text-sm text-slate-600 dark:text-zinc-400" type="button" onClick={() => removeBlock(block.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 mt-4">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input
                        value={block.title}
                        onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Content Type</Label>
                      <select
                        value={block.type}
                        onChange={(event) => updateBlock(block.id, { type: event.target.value as ContentBlock["type"] })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="text">Text</option>
                        <option value="video">Video URL</option>
                        <option value="document">Document Upload</option>
                        <option value="quiz">Quiz</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {block.type === "quiz" && (
                      <div className="space-y-3">
                        {block.quizData && block.quizData.questions && block.quizData.questions.length > 0 ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                            Quiz ready — {block.quizData.questions.length} question{block.quizData.questions.length === 1 ? "" : "s"}, pass mark {block.quizData.passPercentage ?? 70}%.
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                            No questions yet — add the quiz details before saving the course.
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setQuizModalBlockId(block.id)}
                        >
                          {block.quizData && block.quizData.questions && block.quizData.questions.length > 0 ? "Edit Quiz Details" : "Add Quiz Details"}
                        </Button>
                      </div>
                    )}

                    {block.type === "text" && (
                      <div className="space-y-2">
                        <Label>Text Content</Label>
                        <Textarea
                          value={block.body}
                          onChange={(event) => updateBlock(block.id, { body: event.target.value })}
                          rows={4}
                        />
                      </div>
                    )}

                    {block.type === "video" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Video File Upload</Label>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/ogg,video/quicktime"
                            onChange={(event) => updateBlock(block.id, { file: event.target.files?.[0] ?? null })}
                            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900 dark:text-zinc-100"
                          />
                          <p className="text-xs text-slate-500 dark:text-zinc-400">Supported formats: MP4, WebM, OGG, MOV. Max file size depends on your Firebase plan.</p>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200 dark:border-white/10" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-50 dark:bg-zinc-900 px-2 text-slate-500 dark:text-zinc-400">Or use an external URL</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Video URL</Label>
                          <Input
                            value={block.url}
                            onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </div>
                      </div>
                    )}

                    {block.type === "document" && (
                      <div className="space-y-2">
                        <Label>Document File</Label>
                        <input
                          type="file"
                          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(event) => updateBlock(block.id, { file: event.target.files?.[0] ?? null })}
                          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900 dark:text-zinc-100"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quiz authoring modal — edits the quiz block held in local state;
                the quiz document itself is created after the course is saved. */}
            {quizModalBlockId !== null && (() => {
              const quizBlock = contentBlocks.find((b) => b.id === quizModalBlockId);
              if (!quizBlock) return null;
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
                        {quizBlock.quizData && quizBlock.quizData.questions && quizBlock.quizData.questions.length > 0 ? "Edit Quiz Details" : "Add Quiz Details"}
                      </h2>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setQuizModalBlockId(null)}
                      >
                        ×
                      </Button>
                    </div>
                    <p className="text-slate-600 dark:text-zinc-400 mb-4">
                      This quiz will be placed at position {quizBlock.order} in the course stream.
                    </p>
                    <QuizForm
                      mode="create"
                      courseId="new-course"
                      initialQuiz={quizBlock.quizData}
                      onSave={(quiz) => handleQuizBlockSave(quizBlock.id, quiz)}
                      isSaving={isSavingQuizBlock}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600 dark:text-zinc-400">Publish now to make the course available to students.</div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-primary focus:ring-primary"
                />
                Publish Course
              </label>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving course..." : "Create Course"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
