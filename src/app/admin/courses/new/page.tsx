"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createCourse, getUserProfile, addCourseContentItem, uploadCourseAsset, isAdminProfile } from "@/lib/course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/navbar";

interface ContentBlock {
  id: number;
  type: "text" | "video" | "document";
  title: string;
  body: string;
  url: string;
  file: File | null;
  order: number;
}

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [published, setPublished] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([
    { id: 1, type: "text", title: "Introduction", body: "", url: "", file: null, order: 1 },
  ]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    setIsSaving(true);

    try {
      if (!title.trim() || !description.trim()) {
        setError("Please enter a course title and description.");
        setIsSaving(false);
        return;
      }

      const courseId = await createCourse({
        title: title.trim(),
        slug: slug.trim() || title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        published,
        coverImageUrl: coverImageUrl.trim(),
      });

      for (const block of contentBlocks) {
        let contentUrl = block.url;
        if (block.type === "document" && block.file) {
          contentUrl = await uploadCourseAsset(block.file, courseId);
        }

        if (block.type === "video" && !contentUrl.trim()) {
          throw new Error("Video blocks require a URL.");
        }

        await addCourseContentItem(courseId, {
          type: block.type,
          title: block.title.trim() || "Untitled section",
          body: block.body.trim(),
          url: contentUrl.trim(),
          order: block.order,
        });
      }

      setMessage("Course created successfully. You can now view it in the admin course list.");
      setTimeout(() => router.push("/admin/courses"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the course.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Checking admin permissions...</p>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Course</h1>
          <p className="text-slate-600 mb-8">Build a course using structured sections and supporting assets.</p>

          {error && <div className="mb-6 rounded-2xl bg-red-100 border border-red-200 px-4 py-3 text-red-700">{error}</div>}
          {message && <div className="mb-6 rounded-2xl bg-emerald-100 border border-emerald-200 px-4 py-3 text-emerald-700">{message}</div>}

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

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="course-price">Price</Label>
                <Input
                  id="course-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
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
                    <Button variant="ghost" className="text-sm text-slate-600" type="button" onClick={() => removeBlock(block.id)}>
                      Remove
                    </Button>
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
                      <div className="space-y-2">
                        <Label>Video URL</Label>
                        <Input
                          value={block.url}
                          onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
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
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">Publish now to make the course available to students.</div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
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
