import type { User } from "firebase/auth";
import type { Course, CourseContentItem, CourseProgress, Enrollment, UserProfile } from "./types";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

function slugify(value: string) {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CourseCreateData = Omit<Course, "id" | "createdAt" | "updatedAt">;
export type CourseContentCreateData = Omit<CourseContentItem, "id" | "courseId">;

export async function createUserProfile(user: User, role: "student" | "admin" = "student") {
  const profileRef = doc(db, "users", user.uid);
  await setDoc(profileRef, {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const profileRef = doc(db, "users", uid);
  const snapshot = await getDoc(profileRef);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as unknown as UserProfile) : null;
}

export async function getAllCourses(): Promise<Course[]> {
  const coursesRef = collection(db, "courses");
  const courseQuery = query(coursesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(courseQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Course));
}

export async function getPublishedCourses(): Promise<Course[]> {
  const coursesRef = collection(db, "courses");
  const courseQuery = query(coursesRef, where("published", "==", true), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(courseQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Course));
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const coursesRef = collection(db, "courses");
  const courseQuery = query(coursesRef, where("slug", "==", slug), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(courseQuery);
  if (snapshot.empty) {
    return null;
  }
  const first = snapshot.docs[0];
  return { id: first.id, ...first.data() } as Course;
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const courseRef = doc(db, "courses", courseId);
  const snapshot = await getDoc(courseRef);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Course) : null;
}

export async function createCourse(courseData: Partial<CourseCreateData>): Promise<string> {
  const normalizedSlug = courseData.slug ? slugify(courseData.slug) : slugify(courseData.title ?? "");
  const courseRef = await addDoc(collection(db, "courses"), {
    title: courseData.title ?? "Untitled Course",
    slug: normalizedSlug,
    description: courseData.description ?? "",
    price: courseData.price ?? 0,
    published: courseData.published ?? false,
    coverImageUrl: courseData.coverImageUrl ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return courseRef.id;
}

export async function addCourseContentItem(courseId: string, content: CourseContentCreateData) {
  const contentRef = await addDoc(collection(db, "courses", courseId, "content"), {
    type: content.type,
    title: content.title,
    body: content.body ?? "",
    url: content.url ?? "",
    order: content.order,
    createdAt: serverTimestamp(),
  });
  return contentRef.id;
}

export async function getCourseContent(courseId: string): Promise<CourseContentItem[]> {
  const contentRef = collection(db, "courses", courseId, "content");
  const contentQuery = query(contentRef, orderBy("order", "asc"));
  const snapshot = await getDocs(contentQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, courseId, ...docSnap.data() } as CourseContentItem));
}

export async function uploadCourseAsset(file: File, courseId: string): Promise<string> {
  const storageRef = ref(storage, `courses/${courseId}/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function createEnrollment(userId: string, courseId: string): Promise<void> {
  const enrollmentRef = doc(db, "enrollments", `${userId}_${courseId}`);
  await setDoc(enrollmentRef, {
    id: `${userId}_${courseId}`,
    userId,
    courseId,
    enrolledAt: serverTimestamp(),
  });
}

export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const enrollmentRef = doc(db, "enrollments", `${userId}_${courseId}`);
  const snapshot = await getDoc(enrollmentRef);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Enrollment) : null;
}

export async function getEnrollmentsForUser(userId: string): Promise<Enrollment[]> {
  const enrollmentsRef = collection(db, "enrollments");
  const enrollmentQuery = query(enrollmentsRef, where("userId", "==", userId), orderBy("enrolledAt", "desc"));
  const snapshot = await getDocs(enrollmentQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Enrollment));
}

export async function deleteCourse(courseId: string): Promise<void> {
  const courseRef = doc(db, "courses", courseId);
  await deleteDoc(courseRef);
}

export async function updateCourse(courseId: string, updates: Partial<CourseCreateData>): Promise<void> {
  const courseRef = doc(db, "courses", courseId);
  await setDoc(courseRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteCourseContentItem(courseId: string, contentId: string): Promise<void> {
  const contentRef = doc(db, "courses", courseId, "content", contentId);
  await deleteDoc(contentRef);
}

export async function updateCourseContentItem(courseId: string, contentId: string, updates: Partial<CourseContentCreateData>): Promise<void> {
  const contentRef = doc(db, "courses", courseId, "content", contentId);
  await setDoc(contentRef, {
    ...updates,
  }, { merge: true });
}

export async function getCourseProgress(userId: string, courseId: string): Promise<CourseProgress | null> {
  const progressRef = doc(db, "progress", `${userId}_${courseId}`);
  const snapshot = await getDoc(progressRef);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as CourseProgress) : null;
}

export async function markContentCompleted(userId: string, courseId: string, contentId: string): Promise<void> {
  const progressRef = doc(db, "progress", `${userId}_${courseId}`);
  const snapshot = await getDoc(progressRef);
  
  if (snapshot.exists()) {
    const data = snapshot.data();
    const completedIds = data.completedContentIds || [];
    if (!completedIds.includes(contentId)) {
      await setDoc(progressRef, {
        completedContentIds: [...completedIds, contentId],
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } else {
    await setDoc(progressRef, {
      id: `${userId}_${courseId}`,
      userId,
      courseId,
      completedContentIds: [contentId],
      updatedAt: serverTimestamp(),
    });
  }
}

export async function markContentIncomplete(userId: string, courseId: string, contentId: string): Promise<void> {
  const progressRef = doc(db, "progress", `${userId}_${courseId}`);
  const snapshot = await getDoc(progressRef);
  
  if (snapshot.exists()) {
    const data = snapshot.data();
    const completedIds = (data.completedContentIds || []).filter((id: string) => id !== contentId);
    await setDoc(progressRef, {
      completedContentIds: completedIds,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

export async function getTotalUsers(): Promise<number> {
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  return snapshot.size;
}

export async function getTotalCourses(): Promise<number> {
  const coursesRef = collection(db, "courses");
  const snapshot = await getDocs(coursesRef);
  return snapshot.size;
}

export async function getTotalEnrollments(): Promise<number> {
  const enrollmentsRef = collection(db, "enrollments");
  const snapshot = await getDocs(enrollmentsRef);
  return snapshot.size;
}

export function isAdminProfile(profile: UserProfile | null) {
  return profile?.role === "admin";
}
