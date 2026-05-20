"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { getUserProfile, isAdminProfile } from "@/lib/course";
import { Shield } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated and has a verified email
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser || !currentUser.emailVerified) {
        router.push("/auth");
      } else {
        setUser(currentUser);
        // Check if user has admin role
        const profile = await getUserProfile(currentUser.uid);
        setIsAdmin(isAdminProfile(profile));
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            CSCS<span className="text-primary">ProPass</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                variant="ghost"
                className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                onClick={() => router.push("/admin")}
              >
                <Shield className="h-4 w-4 mr-1.5" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to Your Dashboard!</h1>
          <p className="text-slate-600 mb-8">
            Hello, <span className="font-semibold">{user?.email}</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admin Panel Card - only shown for admin users */}
            {isAdmin && (
              <div className="border-2 border-amber-200 rounded-lg p-6 bg-amber-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-amber-500 p-2 text-white">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-semibold">Admin Panel</h2>
                </div>
                <p className="text-slate-600 mb-4">
                  Manage courses, users, and platform settings.
                </p>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => router.push('/admin')}
                >
                  Go to Admin Dashboard
                </Button>
              </div>
            )}

            <div className="border border-slate-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">My Courses</h2>
              <p className="text-slate-600 mb-4">
                Access your enrolled courses and continue learning.
              </p>
              <Button onClick={() => router.push('/dashboard/my-courses')}>View Courses</Button>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
              <p className="text-slate-600 mb-4">
                Update your profile information and preferences.
              </p>
              <Button variant="outline" onClick={() => router.push('/dashboard/profile')}>Edit Profile</Button>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Progress</h2>
              <p className="text-slate-600 mb-4">
                Track your learning progress and achievements.
              </p>
              <Button variant="outline">View Progress</Button>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Resources</h2>
              <p className="text-slate-600 mb-4">
                Access study materials and additional resources.
              </p>
              <Button variant="outline">Browse Resources</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}