/**
 * Server-side course data access using the Firebase Admin SDK.
 *
 * These functions mirror the client-side helpers in `src/lib/course.ts` but
 * run on the server (Node.js) so they can be used in `generateMetadata`,
 * `sitemap.ts`, and other server components / route handlers without
 * requiring a browser environment.
 */

import { adminDb } from "@/lib/firebase-admin";
import type { Course } from "@/lib/types";

/**
 * Fetch all published courses from Firestore using the Admin SDK.
 * Returns an empty array on error so sitemaps / metadata never crash a build.
 */
export async function getPublishedCoursesServer(): Promise<Course[]> {
  try {
    const snapshot = await adminDb
      .collection("courses")
      .where("published", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Course[];
  } catch (error) {
    console.error("[getPublishedCoursesServer] Error:", error);
    return [];
  }
}

/**
 * Fetch a single published course by slug using the Admin SDK.
 * Returns null if not found or on error.
 */
export async function getCourseBySlugServer(
  slug: string
): Promise<Course | null> {
  try {
    const snapshot = await adminDb
      .collection("courses")
      .where("slug", "==", slug)
      .where("published", "==", true)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const first = snapshot.docs[0];
    return { id: first.id, ...first.data() } as Course;
  } catch (error) {
    console.error("[getCourseBySlugServer] Error:", error);
    return null;
  }
}