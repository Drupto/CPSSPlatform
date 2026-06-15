"use server";

import { startQuizAttempt, submitQuizAttempt } from "@/lib/server/quiz-attempts";
import type { StartQuizAttemptResult, SubmitQuizAttemptResult } from "@/lib/server/quiz-attempts";

export async function startQuizAttemptAction(courseId: string, quizId: string, idToken: string): Promise<StartQuizAttemptResult> {
  return startQuizAttempt({ courseId, quizId, idToken });
}

export async function submitQuizAttemptAction(sessionId: string, answers: number[], idToken: string): Promise<SubmitQuizAttemptResult> {
  return submitQuizAttempt({ sessionId, answers, idToken });
}
