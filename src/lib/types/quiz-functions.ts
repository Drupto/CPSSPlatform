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