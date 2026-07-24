import { onCall } from "firebase-functions/v2/https";
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
    throw new Error("User is not enrolled in this course");
  }
}

export const startQuizAttempt = onCall<StartQuizAttemptRequest, Promise<StartQuizAttemptResponse>>(
  async (request) => {
    const { courseId, quizId } = request.data;

    if (!courseId || !quizId) {
      throw new Error("Missing courseId or quizId");
    }

    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("Unauthenticated");
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
        throw new Error("Quiz is not available");
      }

      if (!quizSnap.exists) {
        throw new Error("Quiz was not found");
      }

      const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${courseId}`));
      assertEnrolled(enrollmentSnap.data(), userId, courseId);

      const quiz = { id: quizSnap.id, ...quizSnap.data() } as Record<string, unknown>;
      const maxAttempts = Math.max(1, Number(quiz.maxAttempts ?? 1));

      const attemptsQuery = db
        .collection("quizAttempts")
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .where("quizId", "==", quizId)
        .limit(maxAttempts);

      const attemptsSnap = await transaction.get(attemptsQuery);

      if (attemptsSnap.size >= maxAttempts) {
        throw new Error("Quiz attempts have been used");
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
          throw new Error("Quiz attempt already in progress");
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
        attemptsUsed: attemptsSnap.size,
        expiresAtMs: expiresAt?.toMillis() ?? null,
      };
    });
  }
);

export const submitQuizAttempt = onCall<SubmitQuizAttemptRequest, Promise<SubmitQuizAttemptResponse>>(
  async (request) => {
    const { sessionId, answers } = request.data;

    if (!sessionId || !Array.isArray(answers)) {
      throw new Error("Missing sessionId or answers");
    }

    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const db = admin.firestore();

    return db.runTransaction(async (transaction) => {
      const sessionRef = db.doc(`quizSessions/${sessionId}`);
      const sessionSnap = await transaction.get(sessionRef);

      if (!sessionSnap.exists) {
        throw new Error("Quiz session was not found");
      }

      const session = sessionSnap.data() as Record<string, unknown>;

      if (session.userId !== userId) {
        throw new Error("Quiz session does not belong to this user");
      }

      if (session.status === "completed") {
        throw new Error("Quiz has already been submitted");
      }

      if (session.status === "expired") {
        throw new Error("Quiz session has expired");
      }

      const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${session.courseId}`));
      assertEnrolled(enrollmentSnap.data(), userId, session.courseId as string);

      const courseRef = db.doc(`courses/${session.courseId}`);
      const quizRef = db.doc(`courses/${session.courseId}/quizzes/${session.quizId}`);

      const [courseSnap, quizSnap] = await Promise.all([
        transaction.get(courseRef),
        transaction.get(quizRef),
      ]);

      if (!courseSnap.exists || !courseSnap.data()?.published) {
        throw new Error("Quiz is not available");
      }

      if (!quizSnap.exists) {
        throw new Error("Quiz was not found");
      }

      const quiz = { id: quizSnap.id, ...quizSnap.data() } as Record<string, unknown>;
      const maxAttempts = Math.max(
        1,
        Number(session.maxAttempts ?? quiz.maxAttempts ?? 1)
      );

      const attemptsQuery = db
        .collection("quizAttempts")
        .where("userId", "==", userId)
        .where("courseId", "==", session.courseId)
        .where("quizId", "==", session.quizId)
        .limit(maxAttempts);

      const attemptsSnap = await transaction.get(attemptsQuery);

      if (attemptsSnap.size >= maxAttempts) {
        throw new Error("Quiz attempts have been used");
      }

      const expiresAtMs = (session.expiresAt as { toMillis: () => number } | undefined)?.toMillis?.() ?? null;

      if (expiresAtMs !== null && Date.now() > expiresAtMs + QUIZ_SUBMISSION_GRACE_MS) {
        throw new Error("Quiz time limit exceeded");
      }

      validateAnswers(quiz, answers);

      const score = getQuizScore(quiz, answers);
      const passed = score >= (quiz.passPercentage as number);

      const attemptRef = db.collection("quizAttempts").doc();
      const completedAt = FieldValue.serverTimestamp();

      transaction.set(attemptRef, {
        userId,
        quizId: session.quizId,
        courseId: session.courseId,
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
        attemptsUsed: attemptsSnap.size + 1,
      };
    });
  }
);