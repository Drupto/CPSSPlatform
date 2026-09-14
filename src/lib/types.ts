import type { Timestamp } from "firebase/firestore";

export type CourseContentType = "text" | "video" | "document" | "link" | "flashcard";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: "student" | "admin";
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  /** Course price in Indian Rupees (INR) — the amount paid via the UPI (KOTAK) QR. */
  price: number;
  /**
   * Legacy USD price (hidden while PayPal is disabled — see PAYPAL_ENABLED
   * in src/lib/payments.ts). Kept so old courses still load and PayPal can
   * be re-enabled later with no migration. Null/undefined = not configured.
   */
  priceUsd?: number | null;
  published: boolean;
  coverImageUrl: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  passPercentage: number;
  questions: QuizQuestion[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  maxAttempts?: number;
  timeLimit?: number;
  randomizeQuestionOrder?: boolean;
  randomizeAnswerOrder?: boolean;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  courseId: string;
  answers: number[]; // Array of selected answer indices
  score: number; // Percentage score
  passed: boolean;
  completedAt: Timestamp | null;
  startedAt?: Timestamp | null;
  expiresAt?: Timestamp | null;
  status?: "pending" | "completed" | "expired";
}

export interface CourseContentItem {
  id: string;
  courseId: string;
  type: CourseContentType;
  title: string;
  body?: string;
  url?: string;
  order: number;
}

export interface Flashcard extends Omit<CourseContentItem, "body"> {
  type: "flashcard";
  front: string;
  back: string;
}

/**
 * Type guard for flashcard content items.
 *
 * `front`/`back` live outside `CourseContentItem`, and legacy documents may be
 * missing them, so this checks both the discriminant and the field types.
 * Use it instead of `as any` casts whenever flashcard fields are needed.
 */
export function isFlashcard(item: CourseContentItem): item is Flashcard {
  return (
    item.type === "flashcard" &&
    typeof (item as Partial<Flashcard>).front === "string" &&
    typeof (item as Partial<Flashcard>).back === "string"
  );
}

export type EnrollmentStatus = "pending" | "approved" | "rejected";

export type PaymentMethod = "upi" | "paypal";

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  requestedAt: Timestamp | null;
  reviewedAt?: Timestamp | null;
  reviewedBy?: string;
  enrolledAt?: Timestamp | null;
  /**
   * Manual payment verification details, submitted by the student on the
   * payment page and checked by an admin before approval. Optional because
   * legacy enrollments (created before payments) don't carry them.
   */
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentSubmittedAt?: Timestamp | null;
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  completedContentIds: string[];
  updatedAt: Timestamp | null;
}
