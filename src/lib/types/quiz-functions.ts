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

export interface QuizAttemptReviewItem {
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation?: string;
}

export interface SubmitQuizAttemptResponse {
  attemptId: string;
  score: number;
  passed: boolean;
  attemptsUsed: number;
  /**
   * Per-question results (correct answer + explanation) revealed only after a
   * successful submission — the pre-submission quiz payload never carries the
   * answer key (see getQuizForStudent in functions/src/quizzes.ts).
   */
  review: QuizAttemptReviewItem[];
}

export interface StudentQuizQuestion {
  id: string;
  question: string;
  options: string[];
}

/** Quiz as served to students — answer key (correctAnswerIndex/explanation) stripped. */
export interface StudentQuiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  passPercentage: number;
  maxAttempts?: number;
  timeLimit?: number;
  randomizeQuestionOrder?: boolean;
  randomizeAnswerOrder?: boolean;
  questions: StudentQuizQuestion[];
}

export interface GetQuizForStudentRequest {
  courseId: string;
  quizId?: string;
}

export interface GetQuizForStudentResponse {
  quizzes: StudentQuiz[];
}