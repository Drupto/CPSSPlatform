import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export interface StartQuizAttemptRequest {
  courseId: string;
  quizId: string;
}

export interface StartQuizAttemptResponse {
  sessionId: string;
  attemptsUsed: number;
  expiresAtMs: number | null;
}

export interface SubmitQuizAttemptRequest {
  sessionId: string;
  answers: number[];
}

export interface SubmitQuizAttemptResponse {
  attemptId: string;
  score: number;
  passed: boolean;
  attemptsUsed: number;
}

const QUIZ_SUBMISSION_GRACE_MS = 5000;

/**
 * Strict ID validation regex — prevents Firestore path traversal.
 * Allows alphanumeric, underscore, and hyphen only (no slashes).
 */
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Session IDs are URL-encoded "userId:quizId" pairs. After encoding,
 * the colon becomes %3A, so the allowed charset is expanded to include
 * % and the encoded colon. We still reject slashes.
 */
const SESSION_ID_RE = /^[A-Za-z0-9_%-]{1,256}$/;

function assertValidId(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || !ID_RE.test(value)) {
    throw new HttpsError("invalid-argument", `Invalid ${fieldName}`);
  }
}

function assertValidSessionId(value: unknown): void {
  if (typeof value !== "string" || !SESSION_ID_RE.test(value)) {
    throw new HttpsError("invalid-argument", "Invalid sessionId");
  }
}

function getQuizTimeLimitSeconds(quiz: Record<string, unknown>): number | null {
  if (quiz.timeLimit === undefined || quiz.timeLimit === null) {
    return null;
  }
  return Math.max(0, Number(quiz.timeLimit)) * 60;
}

function getQuizScore(quiz: Record<string, unknown>, answers: number[]): number {
  const questions = (quiz.questions as Record<string, unknown>[]) ?? [];
  let correctCount = 0;

  questions.forEach((question, index) => {
    if (answers[index] === question.correctAnswerIndex) {
      correctCount++;
    }
  });

  return Math.round((correctCount / questions.length) * 100);
}

function validateAnswers(quiz: Record<string, unknown>, answers: number[]): void {
  const questions = (quiz.questions as Record<string, unknown>[]) ?? [];

  if (!Array.isArray(answers) || answers.length !== questions.length) {
    throw new Error("Invalid quiz answers");
  }

  answers.forEach((answer, index) => {
    const optionsLength = (questions[index].options as unknown[])?.length ?? 0;

    if (!Number.isInteger(answer) || (answer !== -1 && (answer < 0 || answer >= optionsLength))) {
      throw new Error("Invalid quiz answer selection");
    }
  });
}

function getSessionDocId(userId: string, quizId: string): string {
  return encodeURIComponent(`${userId}:${quizId}`);
}

function assertEnrolled(
  enrollmentData: Record<string, unknown> | undefined,
  userId: string,
  courseId: string
): void {
  if (!enrollmentData || enrollmentData.userId !== userId || enrollmentData.courseId !== courseId) {
    throw new HttpsError("permission-denied", "User is not enrolled in this course");
  }
}

/**
 * Counts completed attempts for a specific user + course + quiz using a
 * composite query (backed by the composite index in firestore.indexes.json).
 * This avoids fetching all of a user's attempts across every course/quiz.
 */
async function countAttemptsForQuiz(
  transaction: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  userId: string,
  courseId: string,
  quizId: string
): Promise<number> {
  const attemptsQuery = db
    .collection("quizAttempts")
    .where("userId", "==", userId)
    .where("courseId", "==", courseId)
    .where("quizId", "==", quizId);

  const attemptsSnap = await transaction.get(attemptsQuery);
  return attemptsSnap.size;
}

export const startQuizAttempt = onCall<StartQuizAttemptRequest, Promise<StartQuizAttemptResponse>>(
  async (request) => {
    const { courseId, quizId } = request.data;

    if (!courseId || !quizId) {
      throw new HttpsError("invalid-argument", "Missing courseId or quizId");
    }

    // C1: Validate IDs to prevent Firestore path traversal
    assertValidId(courseId, "courseId");
    assertValidId(quizId, "quizId");

    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "Please sign in to start a quiz");
    }

    const db = admin.firestore();

    return db.runTransaction(async (transaction) => {
      const courseRef = db.doc(`courses/${courseId}`);
      const quizRef = db.doc(`courses/${courseId}/quizzes/${quizId}`);

      const [courseSnap, quizSnap] = await Promise.all([
        transaction.get(courseRef),
        transaction.get(quizRef),
      ]);

      if (!courseSnap.exists || !courseSnap.data()?.published) {
        throw new HttpsError("failed-precondition", "Quiz is not available");
      }

      if (!quizSnap.exists) {
        throw new HttpsError("not-found", "Quiz was not found");
      }

      const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${courseId}`));
      assertEnrolled(enrollmentSnap.data(), userId, courseId);

      const quiz = { id: quizSnap.id, ...quizSnap.data() } as Record<string, unknown>;
      const maxAttempts = Math.max(1, Number(quiz.maxAttempts ?? 1));

      const attemptsForQuiz = await countAttemptsForQuiz(transaction, db, userId, courseId, quizId);

      if (attemptsForQuiz >= maxAttempts) {
        throw new HttpsError("failed-precondition", "Quiz attempts have been used");
      }

      const now = Date.now();
      const timeLimitSeconds = getQuizTimeLimitSeconds(quiz);
      const startedAt = Timestamp.fromMillis(now);
      const expiresAt = timeLimitSeconds === null ? null : Timestamp.fromMillis(now + timeLimitSeconds * 1000);

      const sessionRef = db.doc(`quizSessions/${getSessionDocId(userId, quizId)}`);
      const sessionSnap = await transaction.get(sessionRef);
      const existingSession = sessionSnap.exists ? (sessionSnap.data() as Record<string, unknown>) : null;

      if (existingSession?.status === "pending") {
        const existingExpiresAtMs = (existingSession.expiresAt as { toMillis: () => number } | undefined)?.toMillis?.() ?? null;

        if (existingExpiresAtMs === null || Date.now() <= existingExpiresAtMs + QUIZ_SUBMISSION_GRACE_MS) {
          throw new HttpsError("already-exists", "Quiz attempt already in progress");
        }
      }

      transaction.set(sessionRef, {
        userId,
        quizId,
        courseId,
        status: "pending",
        startedAt,
        expiresAt,
        maxAttempts,
        timeLimitSeconds,
        createdAt: startedAt,
      });

      return {
        sessionId: sessionRef.id,
        attemptsUsed: attemptsForQuiz,
        expiresAtMs: expiresAt?.toMillis() ?? null,
      };
    });
  }
);

export const submitQuizAttempt = onCall<SubmitQuizAttemptRequest, Promise<SubmitQuizAttemptResponse>>(
  async (request) => {
    const { sessionId, answers } = request.data;

    if (!sessionId || !Array.isArray(answers)) {
      throw new HttpsError("invalid-argument", "Missing sessionId or answers");
    }

    // H4: Validate sessionId to prevent Firestore path traversal
    assertValidSessionId(sessionId);

    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError("unauthenticated", "Please sign in to submit your quiz");
    }

    const db = admin.firestore();

    return db.runTransaction(async (transaction) => {
      const sessionRef = db.doc(`quizSessions/${sessionId}`);
      const sessionSnap = await transaction.get(sessionRef);

      if (!sessionSnap.exists) {
        throw new HttpsError("not-found", "Quiz session was not found");
      }

      const session = sessionSnap.data() as Record<string, unknown>;

      if (session.userId !== userId) {
        throw new HttpsError("permission-denied", "Quiz session does not belong to this user");
      }

      if (session.status === "completed") {
        throw new HttpsError("failed-precondition", "Quiz has already been submitted");
      }

      if (session.status === "expired") {
        throw new HttpsError("failed-precondition", "Quiz session has expired");
      }

      const sessionCourseId = session.courseId as string;
      const sessionQuizId = session.quizId as string;

      const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${sessionCourseId}`));
      assertEnrolled(enrollmentSnap.data(), userId, sessionCourseId);

      const courseRef = db.doc(`courses/${sessionCourseId}`);
      const quizRef = db.doc(`courses/${sessionCourseId}/quizzes/${sessionQuizId}`);

      const [courseSnap, quizSnap] = await Promise.all([
        transaction.get(courseRef),
        transaction.get(quizRef),
      ]);

      if (!courseSnap.exists || !courseSnap.data()?.published) {
        throw new HttpsError("failed-precondition", "Quiz is not available");
      }

      if (!quizSnap.exists) {
        throw new HttpsError("not-found", "Quiz was not found");
      }

      const quiz = { id: quizSnap.id, ...quizSnap.data() } as Record<string, unknown>;
      const maxAttempts = Math.max(
        1,
        Number(session.maxAttempts ?? quiz.maxAttempts ?? 1)
      );

      const attemptsForQuiz = await countAttemptsForQuiz(
        transaction,
        db,
        userId,
        sessionCourseId,
        sessionQuizId
      );

      if (attemptsForQuiz >= maxAttempts) {
        throw new HttpsError("failed-precondition", "Quiz attempts have been used");
      }

      const expiresAtMs = (session.expiresAt as { toMillis: () => number } | undefined)?.toMillis?.() ?? null;

      if (expiresAtMs !== null && Date.now() > expiresAtMs + QUIZ_SUBMISSION_GRACE_MS) {
        throw new HttpsError("deadline-exceeded", "Quiz time limit exceeded");
      }

      validateAnswers(quiz, answers);

      const score = getQuizScore(quiz, answers);
      const passed = score >= (quiz.passPercentage as number);

      const attemptRef = db.collection("quizAttempts").doc();
      const completedAt = FieldValue.serverTimestamp();

      transaction.set(attemptRef, {
        userId,
        quizId: sessionQuizId,
        courseId: sessionCourseId,
        answers,
        score,
        passed,
        completedAt,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        status: "completed",
      });

      transaction.set(
        sessionRef,
        {
          status: "completed",
          attemptId: attemptRef.id,
          score,
          passed,
          answers,
          completedAt,
        },
        { merge: true }
      );

      return {
        attemptId: attemptRef.id,
        score,
        passed,
        attemptsUsed: attemptsForQuiz + 1,
      };
    });
  }
);