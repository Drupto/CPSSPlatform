"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, isAdminProfile } from "@/lib/course";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

      setIsAdmin(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Checking admin access...</p>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="bg-white rounded-3xl shadow-lg p-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Admin Dashboard</h1>
          <p className="text-slate-600 mb-8">
            Create and manage courses for the student experience.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/admin/courses" className="rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:border-primary transition">
              <h2 className="text-xl font-semibold mb-2">Course Management</h2>
              <p className="text-slate-600">View and edit all available courses.</p>
            </Link>
            <Link href="/admin/courses/new" className="rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:border-primary transition">
              <h2 className="text-xl font-semibold mb-2">Create New Course</h2>
              <p className="text-slate-600">Build a course using text, video, and document content.</p>
            </Link>
          </div>

          <div className="mt-10">
            <Button onClick={() => router.push("/admin/courses/new")}>Create a Course</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
