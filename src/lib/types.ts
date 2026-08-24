import type { Timestamp } from "firebase/firestore";

export type CourseContentType = "text" | "video" | "document" | "link" | "flashcard";

/**
 * DruptoLMS platform roles.
 * - `student`: learner on the marketplace (no tenant).
 * - `institute`: coaching institute that purchased a plan; owns a tenant workspace.
 * - `super`  : platform owner; sees everything and manages plans/institutes/payouts.
 */
export type UserRole = "student" | "institute" | "super";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  /** Required when role === "institute"; may be null for marketplace students / super. */
  instituteId?: string;
  /** Super-only flag for platform staff accounts. */
  isSuper?: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  published: boolean;
  coverImageUrl: string;
  /** Owning tenant. Old/platform-owned courses may leave this undefined (platform default). */
  instituteId?: string;
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

export type EnrollmentStatus = "pending" | "approved" | "rejected";

export type EnrollmentSource = "order" | "manual";

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  /**
   * How access was granted:
   * - `manual`: legacy request/approve flow (administrator grants access).
   * - `order`: automatically granted after a successful paid purchase.
   */
  source?: EnrollmentSource;
  /** Populated when source === "order". */
  orderId?: string;
  requestedAt: Timestamp | null;
  reviewedAt?: Timestamp | null;
  reviewedBy?: string;
  enrolledAt?: Timestamp | null;
  revokedAt?: Timestamp | null;
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  completedContentIds: string[];
  updatedAt: Timestamp | null;
}

/* -------------------------------------------------------------------------- */
/* DruptoLMS — SaaS / monetization entities                                   */
/* -------------------------------------------------------------------------- */

export type PlanPeriod = "monthly" | "annual";

/** Resource limits granted by a plan. */
export interface PlanLimits {
  maxCourses: number;
  maxStudents: number;
  storageGb: number;
  staffSeats: number;
}

/**
 * A saleable institute plan, managed by the super admin (`plans/{slug}`).
 */
export interface Plan {
  id: string;
  name: string;
  description?: string;
  priceInr: number;
  period: PlanPeriod;
  limits: PlanLimits;
  /** Platform commission (0–100) taken from institute course sales. */
  commissionPct: number;
  published: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type SubscriptionStatus = "active" | "suspended" | "expired" | "pending";

/**
 * A tenant (coaching institute) that purchased a plan (`institutes/{id}`).
 */
export interface Institute {
  id: string;
  slug: string;
  name: string;
  ownerUid: string;
  planId?: string;
  subscriptionStatus: SubscriptionStatus;
  planExpiresAt?: Timestamp | null;
  limits?: PlanLimits;
  activeOrderId?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type InstituteMemberRole = "admin" | "staff";
export type InstituteMemberStatus = "active" | "invited" | "revoked";

export interface InstituteMember {
  uid: string;
  instituteId: string;
  role: InstituteMemberRole;
  status: InstituteMemberStatus;
  invitedBy: string;
  createdAt: Timestamp | null;
}

/* -------------------------------------------------------------------------- */
/* Orders ledger                                                              */
/* -------------------------------------------------------------------------- */

export type OrderType = "plan" | "course";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderRefund {
  id: string; // Razorpay refund id
  amount: number; // paise
  full: boolean;
  at: Timestamp | null;
}

/**
 * Ledger entry for every monetary event (`orders/{id}`). Function-write only;
 * client SDKs are denied by Firestore rules.
 */
export interface Order {
  id: string;
  type: OrderType;
  buyerId: string;
  instituteId?: string; // recipient institute (plan order OR course's tenant)
  courseId?: string; // only for type === "course"
  planId?: string; // only for type === "plan"
  amount: number; // paise charged to buyer (gross)
  commissionPct: number; // snapshot at purchase time
  commission: number; // platform share in paise (snapshot)
  instituteShare: number; // amount - commission in paise (snapshot)
  currency: string; // "INR"
  status: OrderStatus;
  gatewayRef?: string; // Razorpay order id
  paymentId?: string; // Razorpay payment id on success
  planPeriodMonths?: number;
  refund?: OrderRefund;
  note?: string;
  createdAt: Timestamp | null;
  paidAt?: Timestamp | null;
  updatedAt: Timestamp | null;
}

/* -------------------------------------------------------------------------- */
/* Payouts (super → institute settlement)                                     */
/* -------------------------------------------------------------------------- */

export type PayoutStatus = "pending" | "paid" | "failed";

export interface Payout {
  id: string;
  instituteId: string;
  amount: number; // paise (instituteShare of completed orders)
  periodStart: Timestamp | null;
  periodEnd: Timestamp | null;
  orderIds: string[];
  status: PayoutStatus;
  reference?: string; // external bank/Razorpay payout reference
  createdAt: Timestamp | null;
  paidAt?: Timestamp | null;
  failedReason?: string;
}
