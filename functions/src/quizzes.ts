import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Quiz data for students.
 *
 * Quiz documents contain the answer key (correctAnswerIndex/explanation), so
 * Firestore rules block direct client reads. Students fetch quizzes exclusively
 * through this callable, which verifies authentication, publication, and
 * approved enrollment server-side, then strips the answer key before it ever
 * crosses the wire. Correct answers are revealed only post-submission via the
 * `review` array in submitQuizAttempt's response.
 */

export interface GetQuizForStudentRequest {
  courseId: string;
  /** Omit to list every quiz for the course; provide for a single quiz. */
  quizId?: string;
}

export interface SanitizedQuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface SanitizedQuiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  passPercentage: number;
  maxAttempts?: number;
  timeLimit?: number;
  randomizeQuestionOrder?: boolean;
  randomizeAnswerOrder?: boolean;
  questions: SanitizedQuizQuestion[];
}

// Same strict validation as quiz-attempts.ts (no slashes → no path traversal).
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

function sanitizeQuestion(question: Record<string, unknown>): SanitizedQuizQuestion {
  const options = Array.isArray(question.options) ? (question.options as unknown[]).map(String) : [];
  return {
    id: typeof question.id === "string" ? question.id : "",
    question: typeof question.question === "string" ? question.question : "",
    options,
  };
}

function sanitizeQuiz(quizId: string, courseId: string, data: Record<string, unknown>): SanitizedQuiz {
  const questions = Array.isArray(data.questions) ? (data.questions as Record<string, unknown>[]) : [];
  return {
    id: quizId,
    courseId,
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    passPercentage: Number(data.passPercentage ?? 0),
    ...(data.maxAttempts !== undefined && { maxAttempts: Number(data.maxAttempts) }),
    ...(data.timeLimit !== undefined && data.timeLimit !== null && { timeLimit: Number(data.timeLimit) }),
    ...(data.randomizeQuestionOrder !== undefined && {
      randomizeQuestionOrder: Boolean(data.randomizeQuestionOrder),
    }),
    ...(data.randomizeAnswerOrder !== undefined && {
      randomizeAnswerOrder: Boolean(data.randomizeAnswerOrder),
    }),
    questions: questions.map(sanitizeQuestion),
  };
}

export const getQuizForStudent = onCall<GetQuizForStudentRequest, Promise<{ quizzes: SanitizedQuiz[] }>>(
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError("unauthenticated", "Please sign in to view quizzes");
    }

    const { courseId, quizId } = request.data ?? ({} as GetQuizForStudentRequest);

    if (typeof courseId !== "string" || !ID_RE.test(courseId)) {
      throw new HttpsError("invalid-argument", "Invalid courseId");
    }
    if (quizId !== undefined && (typeof quizId !== "string" || !ID_RE.test(quizId))) {
      throw new HttpsError("invalid-argument", "Invalid quizId");
    }

    const db = admin.firestore();

    const [courseSnap, enrollmentSnap] = await Promise.all([
      db.doc(`courses/${courseId}`).get(),
      db.doc(`enrollments/${userId}_${courseId}`).get(),
    ]);

    if (!courseSnap.exists || !courseSnap.data()?.published) {
      throw new HttpsError("failed-precondition", "Course is not available");
    }

    const enrollment = enrollmentSnap.data();
    if (
      !enrollment ||
      enrollment.userId !== userId ||
      enrollment.courseId !== courseId ||
      enrollment.status !== "approved"
    ) {
      throw new HttpsError("permission-denied", "You are not enrolled in this course");
    }

    let sanitized: SanitizedQuiz[];
    if (quizId) {
      const quizDoc = await db.doc(`courses/${courseId}/quizzes/${quizId}`).get();
      if (!quizDoc.exists) {
        throw new HttpsError("not-found", "Quiz was not found");
      }
      sanitized = [sanitizeQuiz(quizDoc.id, courseId, quizDoc.data() as Record<string, unknown>)];
    } else {
      const snapshot = await db
        .collection(`courses/${courseId}/quizzes`)
        .orderBy("createdAt", "desc")
        .get();
      sanitized = snapshot.docs.map((doc) =>
        sanitizeQuiz(doc.id, courseId, doc.data() as Record<string, unknown>)
      );
    }

    return { quizzes: sanitized };
  }
);