"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, isAdminProfile, getTotalUsers, getTotalCourses, getTotalEnrollments } from "@/lib/course";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Users, BookOpen, GraduationCap, TrendingUp } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalEnrollments, setTotalEnrollments] = useState(0);

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
      const [users, courses, enrollments] = await Promise.all([
        getTotalUsers(),
        getTotalCourses(),
        getTotalEnrollments(),
      ]);
      setTotalUsers(users);
      setTotalCourses(courses);
      setTotalEnrollments(enrollments);
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

  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users, color: "bg-blue-500" },
    { label: "Total Courses", value: totalCourses, icon: BookOpen, color: "bg-emerald-500" },
    { label: "Total Enrollments", value: totalEnrollments, icon: GraduationCap, color: "bg-violet-500" },
    { label: "Revenue", value: `₹${totalCourses * 0}`, icon: TrendingUp, color: "bg-amber-500" },
  ];

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="bg-white rounded-3xl shadow-lg p-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Admin Dashboard</h1>
          <p className="text-slate-600 mb-8">
            Overview and management of your course platform.
          </p>

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${stat.color} rounded-lg p-2 text-white`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm text-slate-500">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/admin/courses" className="rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:border-primary transition">
                <h2 className="text-xl font-semibold mb-2">Course Management</h2>
                <p className="text-slate-600">View and edit all available courses.</p>
              </Link>
              <Link href="/admin/courses/new" className="rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:border-primary transition">
                <h2 className="text-xl font-semibold mb-2">Create New Course</h2>
                <p className="text-slate-600">Build a course using text, video, and document content.</p>
              </Link>
              <Link href="/admin/resources" className="rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:border-primary transition">
                <h2 className="text-xl font-semibold mb-2">Resource Management</h2>
                <p className="text-slate-600">Manage study materials and additional resources.</p>
              </Link>
              <Link href="/admin/courses" className="rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:border-primary transition">
                <h2 className="text-xl font-semibold mb-2">Quiz Analytics</h2>
                <p className="text-slate-600">View quiz results and student performance.</p>
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
