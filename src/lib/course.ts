import type { User } from "firebase/auth";
import type { Course, CourseContentItem, CourseProgress, Enrollment, UserProfile, Quiz, QuizAttempt } from "./types";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return url;
  if (url.includes("youtube.com/embed/")) return url;

  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = url.match(youtubeRegex);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

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
  try {
    const storageRef = ref(storage, `courses/${courseId}/${Date.now()}-${file.name}`);
    
    const uploadTask = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadTask.ref);
    
    return downloadUrl;
  } catch (error) {
    const err = error as any;
    if (err.code === "storage/unauthorized") {
      throw new Error(
        "Permission denied. Make sure you have admin role in your profile and Firebase Storage rules allow write access."
      );
    } else if (err.code === "storage/unauthenticated") {
      throw new Error("Please log in again and try uploading the file.");
    } else if (err.code === "storage/object-not-found") {
      throw new Error("The file could not be found after upload. Please try again.");
    } else if (err.code === "storage/project-not-found") {
      throw new Error("Firebase project not found. Check your configuration.");
    } else if (err.code === "storage/quota-exceeded") {
      throw new Error("Storage quota exceeded. Please check your Firebase plan limits.");
    } else {
      throw new Error(`Upload failed: ${err.message || "Unknown error"}`);
    }
  }
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

/**
 * Deletes a file from Firebase Storage given its download URL.
 * Parses the Firebase Storage download URL to extract the object path and deletes it.
 * Silently handles cases where the URL is not a Firebase Storage URL or the file doesn't exist.
 */
export async function deleteStorageFileByUrl(downloadUrl: string): Promise<void> {
  if (!downloadUrl || !downloadUrl.includes("firebasestorage.googleapis.com")) {
    return; // Not a Firebase Storage URL (e.g. YouTube link), nothing to delete
  }

  try {
    // Firebase Storage download URLs are formatted as:
    // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded-path}?alt=media&token={token}
    const urlObj = new URL(downloadUrl);
    const pathSegment = urlObj.pathname.split("/o/")[1];
    if (!pathSegment) return;

    const decodedPath = decodeURIComponent(pathSegment);
    const storageRef = ref(storage, decodedPath);
    await deleteObject(storageRef);
  } catch {
    // Silently ignore if file doesn't exist or can't be deleted
  }
}

/**
 * Deletes a course. Cloud Function will handle cascading deletion of quizzes and content.
 */
export async function deleteCourse(courseId: string): Promise<void> {
  // Simply delete the course document - Cloud Functions will handle cascading cleanup
  const courseRef = doc(db, "courses", courseId);
  await deleteDoc(courseRef);
}

/**
 * Deletes a single content item from Firestore and its associated uploaded file from Storage.
 */
export async function deleteCourseContentItemWithFile(courseId: string, contentId: string, fileUrl?: string): Promise<void> {
  if (fileUrl) {
    await deleteStorageFileByUrl(fileUrl);
  }

  const contentRef = doc(db, "courses", courseId, "content", contentId);
  await deleteDoc(contentRef);
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

/**
 * Gets all resources for a specific course
 */
export async function getCourseResources(courseId: string): Promise<CourseContentItem[]> {
  const resourcesRef = collection(db, "courses", courseId, "resources");
  const resourcesQuery = query(resourcesRef, orderBy("order", "asc"));
  const snapshot = await getDocs(resourcesQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, courseId, ...docSnap.data() } as CourseContentItem));
}

/**
 * Adds a resource to a course
 */
export async function addCourseResource(courseId: string, resourceData: CourseContentCreateData): Promise<string> {
  const resourceRef = await addDoc(collection(db, "courses", courseId, "resources"), {
    type: resourceData.type,
    title: resourceData.title,
    body: resourceData.body ?? "",
    url: resourceData.url ?? "",
    order: resourceData.order,
    createdAt: serverTimestamp(),
  });
  return resourceRef.id;
}

/**
 * Updates a resource in a course
 */
export async function updateCourseResource(courseId: string, resourceId: string, updates: Partial<CourseContentCreateData>): Promise<void> {
  const resourceRef = doc(db, "courses", courseId, "resources", resourceId);
  await setDoc(resourceRef, {
    ...updates,
  }, { merge: true });
}

/**
 * Deletes a resource from a course
 */
export async function deleteCourseResource(courseId: string, resourceId: string): Promise<void> {
  const resourceRef = doc(db, "courses", courseId, "resources", resourceId);
  await deleteDoc(resourceRef);
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

/**
 * Creates a new quiz for a course
 */
export async function createQuiz(courseId: string, quizData: Partial<Quiz>): Promise<string> {
  const quizRef = await addDoc(collection(db, "courses", courseId, "quizzes"), {
    title: quizData.title ?? "Untitled Quiz",
    description: quizData.description ?? "",
    passPercentage: quizData.passPercentage ?? 70,
    questions: quizData.questions ?? [],
    maxAttempts: quizData.maxAttempts ?? 1,
    timeLimit: quizData.timeLimit === null ? undefined : quizData.timeLimit,
    randomizeQuestionOrder: quizData.randomizeQuestionOrder ?? false,
    randomizeAnswerOrder: quizData.randomizeAnswerOrder ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return quizRef.id;
}

/**
 * Gets all quizzes for a course
 */
export async function getCourseQuizzes(courseId: string): Promise<Quiz[]> {
  const quizzesRef = collection(db, "courses", courseId, "quizzes");
  const quizQuery = query(quizzesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(quizQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, courseId, ...docSnap.data() } as Quiz));
}

/**
 * Gets a specific quiz by ID
 */
export async function getQuizById(quizId: string, courseId?: string): Promise<Quiz | null> {
  // If courseId is provided, use the correct subcollection path
  if (courseId) {
    const quizRef = doc(db, "courses", courseId, "quizzes", quizId);
    const snapshot = await getDoc(quizRef);
    return snapshot.exists() ? ({ id: snapshot.id, courseId, ...snapshot.data() } as Quiz) : null;
  }
  
  // Fallback for backward compatibility (searches all courses - slower)
  const coursesRef = collection(db, "courses");
  const coursesSnapshot = await getDocs(coursesRef);
  
  for (const courseDoc of coursesSnapshot.docs) {
    const quizRef = doc(db, "courses", courseDoc.id, "quizzes", quizId);
    const quizSnapshot = await getDoc(quizRef);
    if (quizSnapshot.exists()) {
      return { id: quizSnapshot.id, courseId: courseDoc.id, ...quizSnapshot.data() } as Quiz;
    }
  }
  
  return null;
}

/**
 * Updates a quiz
 */
export async function updateQuiz(courseId: string, quizId: string, updates: Partial<Quiz>): Promise<void> {
  const quizRef = doc(db, "courses", courseId, "quizzes", quizId);
  await setDoc(quizRef, {
    ...updates,
    timeLimit: updates.timeLimit === null ? undefined : updates.timeLimit,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Deletes a quiz
 */
export async function deleteQuiz(quizId: string, courseId: string): Promise<void> {
  const quizRef = doc(db, "courses", courseId, "quizzes", quizId);
  await deleteDoc(quizRef);
}

/**
 * Creates a quiz attempt
 */
export async function createQuizAttempt(attemptData: Partial<QuizAttempt>): Promise<string> {
  const attemptRef = await addDoc(collection(db, "quizAttempts"), {
    userId: attemptData.userId,
    quizId: attemptData.quizId,
    courseId: attemptData.courseId,
    answers: attemptData.answers ?? [],
    score: attemptData.score ?? 0,
    passed: attemptData.passed ?? false,
    completedAt: serverTimestamp(),
  });
  return attemptRef.id;
}

/**
 * Gets all quiz attempts for a user and quiz
 */
export async function getUserQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
  const attemptsRef = collection(db, "quizAttempts");
  const attemptsQuery = query(attemptsRef, 
    where("userId", "==", userId),
    where("quizId", "==", quizId),
    orderBy("completedAt", "desc")
  );
  const snapshot = await getDocs(attemptsQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as QuizAttempt));
}

/**
 * Gets all quiz attempts for a user in a course
 */
export async function getCourseQuizAttempts(userId: string, courseId: string): Promise<QuizAttempt[]> {
  const attemptsRef = collection(db, "quizAttempts");
  const attemptsQuery = query(attemptsRef, 
    where("userId", "==", userId),
    where("courseId", "==", courseId),
    orderBy("completedAt", "desc")
  );
  const snapshot = await getDocs(attemptsQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as QuizAttempt));
}

/**
 * Gets all quiz attempts for a course (for admin analytics)
 */
export async function getAllQuizAttemptsForCourse(courseId: string): Promise<QuizAttempt[]> {
  const attemptsRef = collection(db, "quizAttempts");
  const attemptsQuery = query(attemptsRef, 
    where("courseId", "==", courseId),
    orderBy("completedAt", "desc")
  );
  const snapshot = await getDocs(attemptsQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as QuizAttempt));
}

export function isAdminProfile(profile: UserProfile | null) {
  return profile?.role === "admin";
}
