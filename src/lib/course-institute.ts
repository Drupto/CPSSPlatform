import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCoursesForInstitute } from "@/lib/course";
import type { Enrollment } from "@/lib/types";

/**
 * Institute-scoped student/enrollment helpers.
 *
 * Enrollments live top-level (id = `${userId}_${courseId}`). We resolve them by
 * first fetching the institute's courses, then querying enrollments per course
 * (chunking `in` queries at Firestore's 10-item limit) and de-duping.
 */

const IN_MAX = 10;

export async function getEnrollmentsForInstitute(
  instituteId: string
): Promise<Enrollment[]> {
  const courses = await getCoursesForInstitute(instituteId);
  if (courses.length === 0) return [];

  const ref = collection(db, "enrollments");
  const results: Enrollment[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < courses.length; i += IN_MAX) {
    const chunk = courses.slice(i, i + IN_MAX).map((c) => c.id);
    const q = query(ref, where("courseId", "in", chunk));
    const snap = await getDocs(q);
    for (const doc of snap.docs) {
      const enrollment = { id: doc.id, ...doc.data() } as Enrollment;
      if (!seen.has(enrollment.id)) {
        seen.add(enrollment.id);
        results.push(enrollment);
      }
    }
  }
  return results;
}

/** Approved enrollments for a single tenant course. */
export async function getEnrollmentsForCourse(courseId: string): Promise<Enrollment[]> {
  const q = query(collection(db, "enrollments"), where("courseId", "==", courseId));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Enrollment);
}

/** Aggregate enrollment stats for an institute (approved users). */
export async function getInstituteStudentCount(instituteId: string): Promise<number> {
  const enrollments = await getEnrollmentsForInstitute(instituteId);
  return new Set(
    enrollments.filter((e) => e.status === "approved").map((e) => e.userId)
  ).size;
}