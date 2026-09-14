"use client";


import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { 
  getCourseById,
  getCourseContent,
  getUserProfile,
  updateCourse,
  addCourseContentItem,
  updateCourseContentItem,
  deleteCourseContentItemWithFile,
  uploadCourseAsset,
  isAdminProfile,
  getCourseQuizzes,
  createQuiz,
} from "@/lib/course";
import type { Course, CourseContentItem, Quiz } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/navbar";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { QuizForm } from "@/components/admin/quizzes/QuizForm";

interface ContentBlockForm {
  id: string;
  type: "text" | "video" | "document" | "link";
  title: string;
  body: string;
  url: string;
  order: number;
  isNew?: boolean;
  file: File | null;
}

export default function EditCoursePage() {
  const { id: courseId } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  // priceUsd hidden from the form (INR/UPI-only) — setter kept so legacy
  // USD values still load and are preserved on save.
  const [priceUsd, setPriceUsd] = useState("");
  const [published, setPublished] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ContentBlockForm[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

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

      const courseData = await getCourseById(courseId as string);
      if (!courseData) {
        setError("Course not found");
        setLoading(false);
        return;
      }

      setCourse(courseData);
      setTitle(courseData.title);
      setSlug(courseData.slug);
      setDescription(courseData.description);
      setPrice(courseData.price.toString());
      setPriceUsd(courseData.priceUsd != null ? courseData.priceUsd.toString() : "");
      setPublished(courseData.published);
      setCoverImageUrl(courseData.coverImageUrl);

      const content = await getCourseContent(courseData.id);
      const blocks: ContentBlockForm[] = content
        .filter((item) => item.type !== "flashcard")
        .map((item) => ({
          id: item.id,
          type: item.type as "text" | "video" | "document" | "link",
          title: item.title,
          body: item.body || "",
          url: item.url || "",
          order: item.order,
          file: null,
        }));
      setContentBlocks(blocks);
      
      // Load quizzes for this course
      const courseQuizzes = await getCourseQuizzes(courseData.id);
      setQuizzes(courseQuizzes);
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId, router]);

  const addContentBlock = () => {
    setContentBlocks((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        type: "text",
        title: "New Section",
        body: "",
        url: "",
        order: current.length + 1,
        isNew: true,
        file: null,
      },
    ]);
  };

  const updateBlock = (id: string, updates: Partial<ContentBlockForm>) => {
    setContentBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...updates } : block))
    );
  };

  const removeBlock = async (id: string) => {
    const block = contentBlocks.find((b) => b.id === id);
    if (!block) return;

    // If it's an existing block (not newly added), delete from Firestore and Storage
    if (!block.isNew && courseId) {
      try {
        await deleteCourseContentItemWithFile(courseId as string, id, block.url);
      } catch (err) {
        console.error("Failed to delete content item:", err);
        // Continue removing from UI even if backend delete fails
      }
    }

    setContentBlocks((current) => current.filter((block) => block.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setUploadProgress("");
    setIsSaving(true);

    try {
      if (!course || !courseId) {
        throw new Error("Course not found");
      }

      if (!title.trim() || !description.trim()) {
        throw new Error("Please enter a course title and description");
      }

      // Validate all video/document blocks have either a file or URL
      for (let i = 0; i < contentBlocks.length; i++) {
        const block = contentBlocks[i];
        if (block.type === "video" && !block.file && !block.url.trim()) {
          setError(`Section ${i + 1}: Video blocks require a video file upload or a URL.`);
          setIsSaving(false);
          return;
        }
        if (block.type === "document" && !block.file && !block.url.trim()) {
          setError(`Section ${i + 1}: Document blocks require a file upload.`);
          setIsSaving(false);
          return;
        }
      }

      setUploadProgress("Updating course details...");
      await updateCourse(courseId as string, {
        title: title.trim(),
        slug: slug.trim() || title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        // Blank USD input → null (clears the USD price), never undefined.
        priceUsd: priceUsd.trim() === "" ? null : Number(priceUsd),
        published,
        coverImageUrl: coverImageUrl.trim(),
      });

      // Upload files and prepare content data
      setUploadProgress("Processing content...");
      let totalBlocks = contentBlocks.length;
      
      for (let i = 0; i < contentBlocks.length; i++) {
        const block = contentBlocks[i];
        let contentUrl = block.url;
        
if ((block.type === "document" || block.type === "video") && block.file) {
           try {
             setUploadProgress(`Uploading ${block.type} for section ${i + 1}/${totalBlocks}...`);
             contentUrl = await uploadCourseAsset(block.file, courseId as string);
           } catch (uploadErr) {
             const errorMsg = uploadErr instanceof Error ? uploadErr.message : "Unknown error";
             throw new Error(
               `Failed to upload ${block.type} for section "${block.title}": ${errorMsg}. ` +
               `Check browser console for more details.`
             );
           }
         }

        if (block.isNew) {
          await addCourseContentItem(courseId as string, {
            type: block.type,
            title: block.title.trim() || "Untitled section",
            body: block.body.trim(),
            // Store the raw URL — the learn page sanitizes video URLs at render
            // time via getYouTubeEmbedUrl, so nothing unsafe is ever embedded.
            url: contentUrl.trim(),
            order: block.order,
          });
        } else {
          await updateCourseContentItem(courseId as string, block.id, {
            type: block.type,
            title: block.title.trim() || "Untitled section",
            body: block.body.trim(),
            // Store the raw URL — the learn page sanitizes video URLs at render
            // time via getYouTubeEmbedUrl, so nothing unsafe is ever embedded.
            url: contentUrl.trim(),
            order: block.order,
          });
        }
      }


      setUploadProgress("");
      setMessage("Course updated successfully.");
      setTimeout(() => router.push("/admin/courses"), 1200);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unable to update the course.";
      console.error("Course update error:", err);
      setError(errorMsg);
      setUploadProgress("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuiz = async (quiz: Partial<Quiz>) => {
    if (!courseId) return;
    setIsSavingQuiz(true);
    try {
      await createQuiz(courseId as string, quiz);
      const updatedQuizzes = await getCourseQuizzes(courseId as string);
      setQuizzes(updatedQuizzes);
      setShowQuizForm(false);
    } catch (err) {
      console.error("Error creating quiz:", err);
      alert("Failed to create quiz. Please try again.");
    } finally {
      setIsSavingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading course...</p>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
           <BackToAdminButton />
           <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Course</h1>
           <p className="text-slate-600 mb-8">Update course information and content sections.</p>

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
              <div className="space-y-2 lg:col-span-2">
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
                <Button type="button" variant="outline" onClick={addContentBlock}>
                  Add Section
                </Button>
              </div>

              {contentBlocks.map((block) => (
                <div key={block.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-semibold text-slate-900">Section {block.order}</h3>
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
                        className="text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
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
                        className="text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <Button variant="ghost" className="text-sm text-slate-600" type="button" onClick={() => removeBlock(block.id)}>
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
                        onChange={(event) => updateBlock(block.id, { type: event.target.value as ContentBlockForm["type"] })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="text">Text</option>
                        <option value="video">Video URL</option>
                        <option value="document">Document Upload</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
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
                            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900"
                          />
                          <p className="text-xs text-slate-500">Supported formats: MP4, WebM, OGG, MOV. Max file size depends on your Firebase plan.</p>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-500">Or use an external URL</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Video URL</Label>
                          <Input
                            value={block.url}
                            onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                          {block.url && <p className="text-sm text-slate-500">Current: {block.url}</p>}
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
                          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900"
                        />
                        {block.url && <p className="text-sm text-slate-500">Current file: {block.url}</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

             {/* Quizzes Section */}
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h2 className="text-xl font-semibold">Quizzes</h2>
                 <Button 
                   variant="outline" 
                   onClick={() => setShowQuizForm(true)}
                 >
                   Add New Quiz
                 </Button>
               </div>

               {quizzes.length === 0 ? (
                 <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
                   <p className="text-slate-500">No quizzes found for this course.</p>
                   <Button 
                     className="mt-4" 
                     onClick={() => setShowQuizForm(true)}
                   >
                     Create First Quiz
                   </Button>
                 </div>
               ) : (
                 <div className="grid gap-4">
                   {quizzes.map((quiz) => (
                     <div key={quiz.id} className="rounded-3xl border border-slate-200 bg-white p-6">
                       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                         <div>
                           <h3 className="text-lg font-semibold text-slate-900">{quiz.title}</h3>
                           <p className="text-slate-500">{quiz.description}</p>
                           <div className="mt-2 flex flex-wrap gap-2">
                             <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 text-sm">
                               {quiz.questions.length} questions
                             </span>
                             <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 text-sm">
                               Pass: {quiz.passPercentage}%
                             </span>
                           </div>
                         </div>
                         <div className="flex flex-wrap gap-2">
                           <Button 
                             variant="outline" 
                             onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${quiz.id}/edit`)}
                           >
                             Edit Quiz
                           </Button>
                           <Button 
                             onClick={() => router.push(`/admin/courses/${courseId}/quizzes`)}
                           >
                             View Analytics
                           </Button>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>

             {/* Quiz Creation Modal */}
             {showQuizForm && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                 <div className="bg-white rounded-3xl border border-slate-200 shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                   <div className="flex items-center justify-between mb-4">
                     <h2 className="text-2xl font-bold text-slate-900">Add Quiz</h2>
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => setShowQuizForm(false)}
                      >
                        ×
                      </Button>
                   </div>
                   <p className="text-slate-600 mb-4">Create a new quiz for {course?.title}</p>
                   <QuizForm
                     mode="create"
                     courseId={courseId as string}
                     onSave={handleSaveQuiz}
                     isSaving={isSavingQuiz}
                   />
                   <div className="flex gap-3 mt-6">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => setShowQuizForm(false)}
                      >
                        Cancel
                      </Button>
                   </div>
                 </div>
               </div>
             )}

            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving changes..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/courses")}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
