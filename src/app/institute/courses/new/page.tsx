"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInstitute } from "@/hooks/use-institute";
import { createCourse } from "@/lib/course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function InstituteNewCoursePage() {
  const router = useRouter();
  const { institute, loading } = useInstitute();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("0");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !institute) router.push("/");
  }, [institute, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institute) return;
    setSaving(true);
    setError("");
    try {
      const courseId = await createCourse({
        title: title.trim(),
        slug: slug.trim() || title.trim(),
        price: Number(price) || 0,
        published,
        instituteId: institute.id,
      });
      router.push(`/institute/courses/${courseId}/edit`);
    } catch (err) {
      console.error(err);
      setError("Failed to create course.");
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-600">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">New course</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="NEET Physics 2026" />
      </div>
      <div className="space-y-2">
        <Label>Slug (URL)</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="neet-physics-2026" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Price (₹)</Label>
          <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="space-y-2 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={published} onCheckedChange={(v) => setPublished(!!v)} />
            Publish immediately
          </label>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create course"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/institute/courses")}>Cancel</Button>
      </div>
    </form>
  );
}