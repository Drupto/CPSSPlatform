"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, isAdminProfile } from "@/lib/course";

export default function CreateQuizRedirect() {
  const { id: courseId } = useParams();
  const router = useRouter();

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

      if (courseId) {
        router.push(`/admin/courses/${courseId}/edit`);
      } else {
        router.push("/admin/courses");
      }
    });

    return () => unsubscribe();
  }, [courseId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-lg text-slate-600">Redirecting...</p>
    </div>
  );
}
