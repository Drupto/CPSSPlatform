"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/course";
import { getInstituteById } from "@/lib/institute";
import type { Institute, UserProfile } from "@/lib/types";

/**
 * Resolves the current institute for an institute-role user from their own
 * `users/{uid}` profile (which Firestore rules allow the user to read).
 */
export function useInstitute() {
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const prof = await getUserProfile(user.uid);
        setProfile(prof);
        if (prof?.instituteId) {
          const inst = await getInstituteById(prof.instituteId);
          setInstitute(inst);
        }
      } catch (err) {
        console.error("[useInstitute]", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { institute, profile, loading };
}