import type { Timestamp } from "firebase/firestore";

export type CourseContentType = "text" | "video" | "document" | "link";

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
  price: number;
  published: boolean;
  coverImageUrl: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
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

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Timestamp | null;
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  completedContentIds: string[];
  updatedAt: Timestamp | null;
}
