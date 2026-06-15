import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "./firebase-admin";

const QUIZ_SUBMISSION_GRACE_MS = 5000;

export interface StartQuizAttemptInput {
  courseId: string;
  quizId: string;
  idToken: string;
}

export interface StartQuizAttemptResult {
  sessionId: string;
  attemptsUsed: number;
  expiresAtMs: number | null;
}

export interface SubmitQuizAttemptInput {
  sessionId: string;
  answers: number[];
  idToken: string;
}

export interface SubmitQuizAttemptResult {
  attemptId: string;
  score: number;
  passed: boolean;
  attemptsUsed: number;
}

class QuizActionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "QuizActionError";
    this.statusCode = statusCode;
  }
}

function getQuizTimeLimitSeconds(quiz: Record<string, any>) {
  if (quiz.timeLimit === undefined || quiz.timeLimit === null) {
    return null;
  }

  return Math.max(0, Number(quiz.timeLimit)) * 60;
}

async function verifyUserId(idToken: string) {
  const decodedToken = await getAdminAuth().verifyIdToken(idToken);
  return decodedToken.uid;
}

function getQuizScore(quiz: Record<string, any>, answers: number[]) {
  let correctCount = 0;

  quiz.questions.forEach((question: Record<string, any>, index: number) => {
    if (answers[index] === question.correctAnswerIndex) {
      correctCount++;
    }
  });

  return Math.round((correctCount / quiz.questions.length) * 100);
}

function validateAnswers(quiz: Record<string, any>, answers: number[]) {
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    throw new QuizActionError("Invalid quiz answers", 400);
  }

  answers.forEach((answer, index) => {
    const optionsLength = quiz.questions[index].options?.length;

    if (!Number.isInteger(answer) || (answer !== -1 && (answer < 0 || answer >= optionsLength))) {
      throw new QuizActionError("Invalid quiz answer selection", 400);
    }
  });
}

function getSessionDocId(userId: string, quizId: string) {
  return encodeURIComponent(`${userId}:${quizId}`);
}

function assertEnrolled(enrollmentData: Record<string, any> | undefined, userId: string, courseId: string) {
  if (!enrollmentData || enrollmentData.userId !== userId || enrollmentData.courseId !== courseId) {
    throw new QuizActionError("User is not enrolled in this course", 403);
  }
}

export async function startQuizAttempt(input: StartQuizAttemptInput): Promise<StartQuizAttemptResult> {
  const userId = await verifyUserId(input.idToken);
  const db = getAdminDb();

  return db.runTransaction(async (transaction) => {
    const courseRef = db.doc(`courses/${input.courseId}`);
    const quizRef = db.doc(`courses/${input.courseId}/quizzes/${input.quizId}`);
    const courseSnap = await transaction.get(courseRef);
    const quizSnap = await transaction.get(quizRef);

    if (!courseSnap.exists || !courseSnap.data()?.published) {
      throw new QuizActionError("Quiz is not available", 404);
    }

    if (!quizSnap.exists) {
      throw new QuizActionError("Quiz was not found", 404);
    }

    const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${input.courseId}`));
    assertEnrolled(enrollmentSnap.data(), userId, input.courseId);

    const quiz = { id: quizSnap.id, ...quizSnap.data() } as Record<string, any>;
    const maxAttempts = Math.max(1, Number(quiz.maxAttempts ?? 1));
    const attemptsQuery = db
      .collection("quizAttempts")
      .where("userId", "==", userId)
      .where("courseId", "==", input.courseId)
      .where("quizId", "==", input.quizId)
      .limit(maxAttempts);
    const attemptsSnap = await transaction.get(attemptsQuery);

    if (attemptsSnap.size >= maxAttempts) {
      throw new QuizActionError("Quiz attempts have been used", 403);
    }

    const now = Date.now();
    const timeLimitSeconds = getQuizTimeLimitSeconds(quiz);
    const startedAt = Timestamp.fromMillis(now);
    const expiresAt = timeLimitSeconds === null ? null : Timestamp.fromMillis(now + timeLimitSeconds * 1000);
    const sessionRef = db.doc(`quizSessions/${getSessionDocId(userId, input.quizId)}`);
    const sessionSnap = await transaction.get(sessionRef);
    const existingSession = sessionSnap.exists ? (sessionSnap.data() as Record<string, any>) : null;

    if (existingSession?.status === "pending") {
      const existingExpiresAtMs = existingSession.expiresAt?.toMillis?.() ?? null;

      if (existingExpiresAtMs === null || Date.now() <= existingExpiresAtMs + QUIZ_SUBMISSION_GRACE_MS) {
        throw new QuizActionError("Quiz attempt already in progress", 409);
      }
    }

    transaction.set(sessionRef, {
      userId,
      quizId: input.quizId,
      courseId: input.courseId,
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

export async function submitQuizAttempt(input: SubmitQuizAttemptInput): Promise<SubmitQuizAttemptResult> {
  const userId = await verifyUserId(input.idToken);
  const db = getAdminDb();

  return db.runTransaction(async (transaction) => {
    const sessionRef = db.doc(`quizSessions/${input.sessionId}`);
    const sessionSnap = await transaction.get(sessionRef);

    if (!sessionSnap.exists) {
      throw new QuizActionError("Quiz session was not found", 404);
    }

    const session = sessionSnap.data() as Record<string, any>;

    if (session.userId !== userId) {
      throw new QuizActionError("Quiz session does not belong to this user", 403);
    }

    if (session.status === "completed") {
      throw new QuizActionError("Quiz has already been submitted", 409);
    }

    if (session.status === "expired") {
      throw new QuizActionError("Quiz session has expired", 409);
    }

    const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${session.courseId}`));
    assertEnrolled(enrollmentSnap.data(), userId, session.courseId);

    const courseRef = db.doc(`courses/${session.courseId}`);
    const quizRef = db.doc(`courses/${session.courseId}/quizzes/${session.quizId}`);
    const courseSnap = await transaction.get(courseRef);
    const quizSnap = await transaction.get(quizRef);

    if (!courseSnap.exists || !courseSnap.data()?.published) {
      throw new QuizActionError("Quiz is not available", 404);
    }

    if (!quizSnap.exists) {
      throw new QuizActionError("Quiz was not found", 404);
    }

    const quiz = { id: quizSnap.id, ...quizSnap.data() } as Record<string, any>;
    const maxAttempts = Math.max(1, Number(session.maxAttempts ?? quiz.maxAttempts ?? 1));
    const attemptsQuery = db
      .collection("quizAttempts")
      .where("userId", "==", userId)
      .where("courseId", "==", session.courseId)
      .where("quizId", "==", session.quizId)
      .limit(maxAttempts);
    const attemptsSnap = await transaction.get(attemptsQuery);

    if (attemptsSnap.size >= maxAttempts) {
      throw new QuizActionError("Quiz attempts have been used", 403);
    }

    const expiresAtMs = session.expiresAt?.toMillis?.() ?? null;

    if (expiresAtMs !== null && Date.now() > expiresAtMs + QUIZ_SUBMISSION_GRACE_MS) {
      throw new QuizActionError("Quiz time limit exceeded", 403);
    }

    validateAnswers(quiz, input.answers);

    const score = getQuizScore(quiz, input.answers);
    const passed = score >= quiz.passPercentage;
    const attemptRef = db.collection("quizAttempts").doc();
    const completedAt = FieldValue.serverTimestamp();

    transaction.set(attemptRef, {
      userId,
      quizId: session.quizId,
      courseId: session.courseId,
      answers: input.answers,
      score,
      passed,
      completedAt,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      status: "completed",
    });

    transaction.set(sessionRef, {
      status: "completed",
      attemptId: attemptRef.id,
      score,
      passed,
      answers: input.answers,
      completedAt,
    }, { merge: true });

    return {
      attemptId: attemptRef.id,
      score,
      passed,
      attemptsUsed: attemptsSnap.size + 1,
    };
  });
}
