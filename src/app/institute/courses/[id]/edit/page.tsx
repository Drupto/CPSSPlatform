"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useInstitute } from "@/hooks/use-institute";
import {
  getCourseById,
  updateCourse,
  getCourseContent,
  addCourseContentItem,
  deleteCourseContentItemWithFile,
} from "@/lib/course";
import type { Course, CourseContentItem, CourseContentType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

const CONTENT_TYPES: CourseContentType[] = ["text", "video", "document", "link"];

export default function InstituteEditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { institute, loading: loadingInst } = useInstitute();
  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [published, setPublished] = useState(false);
  const [content, setContent] = useState<CourseContentItem[]>([]);
  const [newType, setNewType] = useState<CourseContentType>("text");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loadingInst) return;
    if (!id || !institute) return;
    (async () => {
      try {
        const c = await getCourseById(id);
        // Only the owning institute can edit.
        if (!c || (c.instituteId && c.instituteId !== institute.id)) {
          router.push("/institute/courses");
          return;
        }
        setCourse(c);
        setTitle(c.title);
        setSlug(c.slug);
        setDescription(c.description ?? "");
        setPrice(String(c.price ?? 0));
        setPublished(!!c.published);
        setContent(await getCourseContent(id));
      } catch (err) {
        console.error(err);
        setError("Failed to load course.");
      }
    })();
  }, [id, institute, loadingInst, router]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateCourse(id, {
        title: title.trim(),
        slug: slug.trim() || title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        published,
      });
      setMessage("Course details saved.");
    } catch (err) {
      console.error(err);
      setError("Failed to save course.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newTitle.trim()) return;
    try {
      await addCourseContentItem(id, {
        type: newType,
        title: newTitle.trim(),
        body: newBody.trim(),
        order: content.length,
      });
      setNewTitle("");
      setNewBody("");
      setContent(await getCourseContent(id));
    } catch (err) {
      console.error(err);
      setError("Failed to add content.");
    }
  };

  const handleDeleteContent = async (item: CourseContentItem) => {
    if (!id || !confirm(`Delete "${item.title}"?`)) return;
    try {
      await deleteCourseContentItemWithFile(id, item.id, item.url);
      setContent(await getCourseContent(id));
    } catch (err) {
      console.error(err);
      setError("Failed to delete content.");
    }
  };
if (!course) {
    return <p className="text-slate-600">Loading course…</p>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Edit course</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <form onSubmit={handleSaveDetails} className="rounded-2xl border border-slate-200 bg-white p-6 max-w-2xl space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Price (₹)</Label>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            rows={4}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={published} onCheckedChange={(v) => setPublished(!!v)} />
          Published (visible & sellable)
        </label>
        <Button type="submit" disabled={saving} className="w-40">{saving ? "Saving…" : "Save details"}</Button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Content sections</h3>
        <form onSubmit={handleAddContent} className="space-y-3 mb-5">
          <div className="flex gap-3">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CourseContentType)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Section title" required />
          </div>
          <Input value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder={newType === "video" || newType === "link" ? "URL" : "Body text"} />
          <Button type="submit" size="sm"><Plus className="h-4 w-4 mr-1" /> Add section</Button>
        </form>

        <div className="space-y-2">
          {content.length === 0 && <p className="text-sm text-slate-500">No sections yet.</p>}
          {content.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <div>
                <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{item.type}</span>
                <span className="text-slate-800">{item.title}</span>
              </div>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteContent(item)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}