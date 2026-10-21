import type { User } from "firebase/auth";
import type { Course, CourseContentItem, CourseProgress, Enrollment, EnrollmentStatus, Flashcard, FlashcardStudyStatus, PaymentMethod, ResourceProgress, UserProfile, Quiz, QuizAttempt } from "./types";
import { isFlashcard } from "./types";
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getDocs, getCountFromServer, limit, orderBy, query, serverTimestamp, setDoc, startAfter, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

/**
 * Returns a strictly-validated YouTube embed URL for the given video URL, or
 * an empty string if the URL is not a recognizable YouTube link.
 *
 * Security: the result is rendered inside an <iframe src>. We therefore never
 * echo the input back — only a canonical `https://www.youtube.com/embed/<id>`
 * URL built from an extracted 11-character video ID is ever returned, so an
 * attacker-controlled URL can never be injected into the iframe.
 */
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = url.match(youtubeRegex);
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : "";
}

function slugify(value: string) {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Throws when another course already owns the given slug. The slug is the
 * public URL key (getCourseBySlug returns the newest match, silently
 * shadowing duplicates), so duplicates are blocked at the data layer.
 * Callers are admin-only pages: the slug list query is rules-compliant only
 * for admins (it carries no published filter).
 */
async function assertSlugAvailable(slug: string, excludeCourseId?: string): Promise<void> {
  const snapshot = await getDocs(query(collection(db, "courses"), where("slug", "==", slug)));
  const owner = snapshot.docs.find((docSnap) => docSnap.id !== excludeCourseId);
  if (owner) {
    throw new Error(`Slug "${slug}" is already used by another course. Choose a different slug.`);
  }
}

export type CourseCreateData = Omit<Course, "id" | "createdAt" | "updatedAt">;
export type CourseContentCreateData = Omit<CourseContentItem, "id" | "courseId">;

/**
 * Payload accepted when creating/updating a course resource. Flashcard-only
 * fields are optional so callers only supply them for `type: "flashcard"`
 * resources; the data layer guarantees they are persisted for flashcards.
 */
export type CourseResourceCreateData = CourseContentCreateData &
  Partial<Pick<Flashcard, "front" | "back">>;

export async function createUserProfile(user: User) {
  const profileRef = doc(db, "users", user.uid);
  await setDoc(profileRef, {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    // Role is intentionally hardcoded to "student". Admin privileges are only
    // granted out-of-band (Firebase console / admin script) — never through
    // this client-side code path.
    role: "student",
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

/**
 * Fetches a PUBLISHED course by slug using a rules-compliant query.
 *
 * Both `where` filters are required: with rules_version = '2', a list query
 * must be provably restricted to documents the caller can read (non-admins
 * may only read courses with published == true), otherwise Firestore rejects
 * the entire query with permission-denied. Use this instead of
 * getCourseBySlug() for any client-side fetch performed by non-admin users.
 */
export async function getPublishedCourseBySlug(slug: string): Promise<Course | null> {
  const coursesRef = collection(db, "courses");
  const courseQuery = query(
    coursesRef,
    where("slug", "==", slug),
    where("published", "==", true),
    orderBy("createdAt", "desc")
  );
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
  const normalizedSlug = slugify(courseData.slug || courseData.title || "");
  await assertSlugAvailable(normalizedSlug);
  const courseRef = await addDoc(collection(db, "courses"), {
    title: courseData.title ?? "Untitled Course",
    slug: normalizedSlug,
    description: courseData.description ?? "",
    price: courseData.price ?? 0,
    // Explicit null (never undefined — Firestore rejects undefined field
    // values in setDoc). null = USD price not configured yet.
    priceUsd: courseData.priceUsd ?? null,
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
    // Quiz-type content items carry the id of the quiz doc they launch; the
    // key is omitted for every other type so existing documents keep their
    // exact shape (Firestore rejects explicit `undefined` values).
    ...(content.quizId ? { quizId: content.quizId } : {}),
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

export interface PaymentSubmissionData {
  method: PaymentMethod;
  reference: string;
}

/**
 * Creates (or updates) the student's pending enrollment together with the
 * payment details submitted on the payment page. The record always lands in
 * "pending" — an admin must manually verify the payment reference before
 * access is granted. Firestore rules enforce the same constraints
 * (see the /enrollments block in firestore.rules).
 *
 * - No existing enrollment → creates it with the payment fields.
 * - Pending enrollment (e.g. created before payments existed) → fills in
 *   the payment fields.
 * - Rejected enrollment ("Request Again") → resets to pending with the new
 *   payment details.
 * - Approved enrollments are never modified here: the learn page redirects
 *   approved users before this function is reachable, and the rules deny
 *   student writes on approved docs anyway.
 */
export async function submitPaymentRequest(
  userId: string,
  courseId: string,
  payment: PaymentSubmissionData
): Promise<void> {
  const enrollmentId = `${userId}_${courseId}`;
  const enrollmentRef = doc(db, "enrollments", enrollmentId);
  // Single merge-write (no pre-read): the pay page previously did
  // getDoc() to decide create-vs-update, but a `get` on a non-existent doc
  // is denied unless the rules explicitly allow it (resource == null), so
  // first-time payers got permission-denied → "Could not submit your payment
  // details". Writing the full shape works for both paths:
  // - doc missing → evaluated as `create` (exact 8-field whitelist below).
  // - doc exists → evaluated as `update`; id/userId/courseId are unchanged
  //   so diff().affectedKeys() only contains status/requestedAt/payment*
  //   (the student branch of the update rule).
  await setDoc(enrollmentRef, {
    id: enrollmentId,
    userId,
    courseId,
    status: "pending",
    requestedAt: serverTimestamp(),
    paymentMethod: payment.method,
    paymentReference: payment.reference.trim(),
    paymentSubmittedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Normalizes a raw Firestore enrollment document into the Enrollment type.
 * Legacy enrollments created before the approval system have no `status` field;
 * they represent already-granted access, so they default to "approved".
 */
function normalizeEnrollment(docSnap: { id: string; data: () => Record<string, any> }): Enrollment {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    status: (data.status as EnrollmentStatus) ?? "approved",
  } as Enrollment;
}

export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const enrollmentRef = doc(db, "enrollments", `${userId}_${courseId}`);
  const snapshot = await getDoc(enrollmentRef);
  return snapshot.exists() ? normalizeEnrollment(snapshot) : null;
}

export async function getEnrollmentsForUser(userId: string): Promise<Enrollment[]> {
  const enrollmentsRef = collection(db, "enrollments");
  const enrollmentQuery = query(enrollmentsRef, where("userId", "==", userId), orderBy("requestedAt", "desc"));
  const snapshot = await getDocs(enrollmentQuery);
  return snapshot.docs.map(normalizeEnrollment);
}

export async function getEnrollmentsForCourse(courseId: string): Promise<Enrollment[]> {
  const enrollmentsRef = collection(db, "enrollments");
  const enrollmentQuery = query(enrollmentsRef, where("courseId", "==", courseId), orderBy("requestedAt", "desc"));
  const snapshot = await getDocs(enrollmentQuery);
  return snapshot.docs.map(normalizeEnrollment);
}

/**
 * Returns all enrollment requests with the given status. Used by the admin
 * approval dashboard.
 */
export async function getEnrollmentRequestsByStatus(status: EnrollmentStatus): Promise<Enrollment[]> {
  const enrollmentsRef = collection(db, "enrollments");
  const enrollmentQuery = query(
    enrollmentsRef,
    where("status", "==", status),
    orderBy("requestedAt", "desc")
  );
  const snapshot = await getDocs(enrollmentQuery);
  return snapshot.docs.map(normalizeEnrollment);
}

/**
 * Returns every enrollment. Used by the admin dashboard's "Approved" tab so that
 * legacy enrollments (created before the approval system, no `status` field) are
 * also shown — normalizeEnrollment marks those as "approved".
 */
export async function getAllEnrollments(): Promise<Enrollment[]> {
  const enrollmentsRef = collection(db, "enrollments");
  const enrollmentQuery = query(enrollmentsRef, orderBy("requestedAt", "desc"));
  const snapshot = await getDocs(enrollmentQuery);
  return snapshot.docs.map(normalizeEnrollment);
}

/**
 * Approves a pending enrollment request, granting the student access to the
 * course. Only callable by an admin (enforced by Firestore rules).
 */
export async function approveEnrollment(enrollmentId: string, adminUid: string): Promise<void> {
  const enrollmentRef = doc(db, "enrollments", enrollmentId);
  await setDoc(enrollmentRef, {
    status: "approved",
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
    enrolledAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Rejects a pending enrollment request. Only callable by an admin
 * (enforced by Firestore rules).
 */
export async function rejectEnrollment(enrollmentId: string, adminUid: string): Promise<void> {
  const enrollmentRef = doc(db, "enrollments", enrollmentId);
  await setDoc(enrollmentRef, {
    status: "rejected",
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
  }, { merge: true });
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
    // Defense-in-depth: the URL may originate from admin-entered content data,
    // so only ever delete objects under the course-assets prefix.
    if (!decodedPath.startsWith("courses/")) {
      return;
    }
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
  // Normalize the slug on every write (mirrors createCourse) so a raw value
  // like "My Course!" can never produce a URL with spaces/special characters,
  // and block duplicates — getCourseBySlug silently shadows older courses
  // sharing a slug. Falls back to the course id if normalization empties the
  // value, keeping every course reachable by URL.
  if (updates.slug !== undefined) {
    const normalizedSlug = slugify(updates.slug || updates.title || "") || courseId;
    await assertSlugAvailable(normalizedSlug, courseId);
    updates = { ...updates, slug: normalizedSlug };
  }
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
    // Audit-trail consistency with the course/quiz/resource update helpers.
    updatedAt: serverTimestamp(),
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
  const resources = snapshot.docs.map((docSnap) => ({ id: docSnap.id, courseId, ...docSnap.data() } as CourseContentItem));
  // Firestore gives no guaranteed order for documents sharing the same
  // `order` value; re-sort client-side (order asc, then doc id) so the listing
  // order is deterministic without needing a composite index.
  return resources.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * Firestore cursor for paginated resource listing (see getVisibleResourcePage).
 */
export type ResourcePageCursor = QueryDocumentSnapshot;

export interface CourseResourcePage {
  /** Non-flashcard resources for this page, in `order` asc sequence. */
  resources: CourseContentItem[];
  /** Pass back to getVisibleResourcePage for the next page; null = exhausted. */
  nextCursor: ResourcePageCursor | null;
}

/**
 * Fetches one page of *non-flashcard* resources for a course, in `order` asc
 * sequence.
 *
 * Flashcard documents are skipped — they surface through the collapsed
 * flashcard deck card instead of individual rows — while the cursor keeps its
 * position, so pagination resumes exactly where this page ended even when
 * hundreds of flashcards sit between two document resources. Reads stay
 * proportional to the rows actually shown (plus skipped cards), never the
 * whole collection.
 */
export async function getVisibleResourcePage(
  courseId: string,
  pageSize = 25,
  cursor?: ResourcePageCursor | null,
): Promise<CourseResourcePage> {
  const resourcesRef = collection(db, "courses", courseId, "resources");
  // Overshoot each fetch: a page dense with flashcards would otherwise need
  // one round-trip per collected row.
  const fetchSize = Math.max(pageSize * 2, 50);
  const collected: { item: CourseContentItem; snap: QueryDocumentSnapshot }[] = [];
  let current: QueryDocumentSnapshot | null = cursor ?? null;

  while (collected.length <= pageSize) {
    const pageQuery = current
      ? query(resourcesRef, orderBy("order", "asc"), startAfter(current), limit(fetchSize))
      : query(resourcesRef, orderBy("order", "asc"), limit(fetchSize));
    const snapshot = await getDocs(pageQuery);
    if (snapshot.empty) {
      current = null;
      break;
    }
    for (const docSnap of snapshot.docs) {
      if (collected.length > pageSize) break;
      const item = { id: docSnap.id, courseId, ...docSnap.data() } as CourseContentItem;
      if (item.type === "flashcard") continue;
      collected.push({ item, snap: docSnap });
    }
    if (collected.length > pageSize) {
      // Cursor lands on the last *returned* row so the next page (startAfter)
      // resumes at the first unreturned row — collected[pageSize] — instead of
      // skipping it.
      current = collected[pageSize - 1].snap;
      collected.length = pageSize;
      break;
    }
    if (snapshot.docs.length < fetchSize) {
      current = null;
      break;
    }
    current = snapshot.docs[snapshot.docs.length - 1];
  }

  return {
    resources: collected.map((entry) => entry.item),
    nextCursor: current,
  };
}

/**
 * Cheap counts for a course's resources via server-side aggregations (no
 * document reads): total resources and total flashcards. Powers the collapsed
 * course sections and flashcard deck cards without loading any documents.
 */
export async function getCourseResourceCounts(courseId: string): Promise<{ total: number; flashcards: number }> {
  const resourcesRef = collection(db, "courses", courseId, "resources");
  const [totalSnap, flashcardSnap] = await Promise.all([
    getCountFromServer(resourcesRef),
    getCountFromServer(query(resourcesRef, where("type", "==", "flashcard"))),
  ]);
  return { total: totalSnap.data().count, flashcards: flashcardSnap.data().count };
}

/**
 * Returns every flashcard of a course, in `order` asc sequence. Used when a
 * study session opens (the session needs the full deck in memory for
 * shuffling/resume/review filtering).
 *
 * The `type` filter runs on the automatic single-field index (no composite
 * index needed — a (type, order) combination would require one); ordering is
 * applied client-side, mirroring getCourseResources.
 */
export async function getCourseFlashcards(courseId: string): Promise<Flashcard[]> {
  const resourcesRef = collection(db, "courses", courseId, "resources");
  const flashcardQuery = query(resourcesRef, where("type", "==", "flashcard"));
  const snapshot = await getDocs(flashcardQuery);
  const flashcards = snapshot.docs.map((docSnap) => ({ id: docSnap.id, courseId, ...docSnap.data() } as Flashcard));
  // Legacy documents may be missing front/back (backfilled by
  // scripts/backfill-flashcards.mjs); the type guard drops anything malformed
  // so the study UI only ever renders complete cards.
  return flashcards
    .filter(isFlashcard)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * Canonical all-empty study state for a user+course. Also used as the
 * client-side fallback when a progress read is unavailable (offline, rules
 * denial on a brand-new account, transient network error) so study UI can
 * still mount without a stored document.
 */
export function emptyResourceProgress(userId: string, courseId: string): ResourceProgress {
  return {
    id: `${userId}_${courseId}`,
    userId,
    courseId,
    viewedResourceIds: {},
    flashcardStates: {},
    lastStudiedCardId: null,
    lastStudiedAt: null,
    updatedAt: null,
  };
}

/**
 * Loads the signed-in user's study state for a course. Never null — returns an
 * empty scaffold so callers can read/update the maps without existence checks.
 */
export async function getResourceProgress(userId: string, courseId: string): Promise<ResourceProgress> {
  const snapshot = await getDoc(doc(db, "resourceProgress", `${userId}_${courseId}`));
  return snapshot.exists()
    ? ({ id: snapshot.id, ...snapshot.data() } as ResourceProgress)
    : emptyResourceProgress(userId, courseId);
}

/**
 * Persists a change to the user's resource progress document.
 *
 * Map fields (viewedResourceIds / flashcardStates) have no atomic server-side
 * "set one key" operation, so the full document is re-merged on every write.
 * Unchanged fields produce no rules diff, keeping the update rules'
 * affectedKeys whitelist satisfied. The resulting client state is returned so
 * callers can reconcile optimistic UI with what was actually written.
 */
async function saveResourceProgress(
  userId: string,
  courseId: string,
  changes: (current: ResourceProgress) => Record<string, unknown>,
): Promise<ResourceProgress> {
  const progressRef = doc(db, "resourceProgress", `${userId}_${courseId}`);
  const snapshot = await getDoc(progressRef);
  const current: ResourceProgress = snapshot.exists()
    ? ({ id: snapshot.id, ...snapshot.data() } as ResourceProgress)
    : emptyResourceProgress(userId, courseId);
  const delta = changes(current);
  // Merge write doubles as create; rules see the post-merge document shape.
  await setDoc(progressRef, { ...current, ...delta, updatedAt: serverTimestamp() }, { merge: true });
  // delta may carry serverTimestamp() sentinels, which callers never read —
  // they re-read via getResourceProgress when precision matters.
  return { ...current, ...delta } as ResourceProgress;
}

/** Marks (or unmarks) a document/link/video resource as done for the user. */
export async function setResourceViewed(
  userId: string,
  courseId: string,
  resourceId: string,
  viewed: boolean,
): Promise<ResourceProgress> {
  return saveResourceProgress(userId, courseId, (current) => {
    const viewedResourceIds = { ...current.viewedResourceIds };
    if (viewed) {
      viewedResourceIds[resourceId] = true;
    } else {
      delete viewedResourceIds[resourceId];
    }
    return { viewedResourceIds };
  });
}

/** Stores (or clears) the study state of a single flashcard for the user. */
export async function setFlashcardStudyState(
  userId: string,
  courseId: string,
  resourceId: string,
  state: FlashcardStudyStatus | null,
): Promise<ResourceProgress> {
  return saveResourceProgress(userId, courseId, (current) => {
    const flashcardStates = { ...current.flashcardStates };
    if (state) {
      flashcardStates[resourceId] = state;
    } else {
      delete flashcardStates[resourceId];
    }
    return { flashcardStates };
  });
}

/** Records the flashcard the user is currently viewing (powers resume). */
export async function setLastStudiedCard(
  userId: string,
  courseId: string,
  cardId: string,
): Promise<ResourceProgress> {
  return saveResourceProgress(userId, courseId, () => ({
    lastStudiedCardId: cardId,
    lastStudiedAt: serverTimestamp(),
  }));
}

/**
 * Builds a whitelisted Firestore payload for a resource document. Explicit
 * fields (instead of spreading caller data) keep the document shape stable,
 * guarantee flashcard documents carry `front`/`back`, and never write
 * flashcard-only fields for non-flashcard resources.
 */
function buildResourcePayload(data: CourseResourceCreateData): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: data.type,
    title: data.title,
    body: data.body ?? "",
    url: data.url ?? "",
    order: data.order,
  };
  if (data.type === "flashcard") {
    payload.front = data.front ?? "";
    payload.back = data.back ?? "";
  }
  return payload;
}

/**
 * Adds a resource to a course
 */
export async function addCourseResource(courseId: string, resourceData: CourseResourceCreateData): Promise<string> {
  const resourceRef = await addDoc(collection(db, "courses", courseId, "resources"), {
    ...buildResourcePayload(resourceData),
    createdAt: serverTimestamp(),
  });
  return resourceRef.id;
}

/**
 * Updates a resource in a course.
 *
 * Only whitelisted fields are written (merged into the existing document),
 * `updatedAt` is stamped, and when the type changes away from "flashcard" the
 * stale `front`/`back` fields are removed from the document instead of
 * lingering. When the type changes TO "flashcard", `front`/`back` are always
 * ensured (defaulting to empty strings) so flashcard documents are complete.
 */
export async function updateCourseResource(courseId: string, resourceId: string, updates: Partial<CourseResourceCreateData>): Promise<void> {
  const resourceRef = doc(db, "courses", courseId, "resources", resourceId);

  const { type, title, body, url, order, front, back } = updates;
  const payload: Record<string, unknown> = {};
  if (title !== undefined) payload.title = title;
  if (body !== undefined) payload.body = body;
  if (url !== undefined) payload.url = url;
  if (order !== undefined) payload.order = order;

  if (type === "flashcard") {
    payload.front = front ?? "";
    payload.back = back ?? "";
  } else if (type !== undefined) {
    payload.front = deleteField();
    payload.back = deleteField();
  } else {
    // Type unchanged (or not part of this update): write whichever flashcard
    // fields were supplied.
    if (front !== undefined) payload.front = front;
    if (back !== undefined) payload.back = back;
  }

  if (type !== undefined) payload.type = type;

  await setDoc(resourceRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Deletes a resource from a course
 */
export async function deleteCourseResource(courseId: string, resourceId: string): Promise<void> {
  const resourceRef = doc(db, "courses", courseId, "resources", resourceId);
  await deleteDoc(resourceRef);
}

/**
 * Copies an existing resource from one course into another as a new,
 * independent document ("copy-paste" semantics — later edits to either copy
 * do not affect the other).
 *
 * The copy is built through addCourseResource, so it goes through the same
 * whitelisted payload construction and validation as any other create.
 * It is appended after the target course's last ordered resource
 * (max order + 1). Legacy flashcard sources missing `front`/`back` are
 * copied with empty card faces, which the admin can fill in afterwards.
 *
 * Throws when both course IDs are identical — the admin UI prevents
 * selecting the source course as a target.
 */
export async function duplicateCourseResource(
  sourceCourseId: string,
  sourceResourceId: string,
  targetCourseId: string
): Promise<string> {
  if (sourceCourseId === targetCourseId) {
    throw new Error("Source and target course must be different.");
  }

  const sourceRef = doc(db, "courses", sourceCourseId, "resources", sourceResourceId);
  const sourceSnapshot = await getDoc(sourceRef);
  if (!sourceSnapshot.exists()) {
    throw new Error("The source resource no longer exists.");
  }

  const source = { id: sourceSnapshot.id, courseId: sourceCourseId, ...sourceSnapshot.data() } as CourseContentItem;
  const targetResources = await getCourseResources(targetCourseId);
  const nextOrder = targetResources.reduce((max, resource) => Math.max(max, resource.order), 0) + 1;

  return addCourseResource(targetCourseId, {
    title: source.title,
    type: source.type,
    body: source.body ?? "",
    url: source.url ?? "",
    order: nextOrder,
    ...(source.type === "flashcard"
      ? { front: isFlashcard(source) ? source.front : "", back: isFlashcard(source) ? source.back : "" }
      : {}),
  });
}

export async function markContentCompleted(userId: string, courseId: string, contentId: string): Promise<void> {
  const progressRef = doc(db, "progress", `${userId}_${courseId}`);
  const snapshot = await getDoc(progressRef);
  
  if (snapshot.exists()) {
    // Atomic array update — the previous read-then-write sequence lost a
    // completion whenever the same user had the course open in two tabs.
    await setDoc(progressRef, {
      completedContentIds: arrayUnion(contentId),
      updatedAt: serverTimestamp(),
    }, { merge: true });
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
    // Atomic removal (see markContentCompleted) — avoids the read-then-write
    // race between tabs and keeps the update rules' affectedKeys whitelist
    // (completedContentIds + updatedAt only) satisfied.
    await setDoc(progressRef, {
      completedContentIds: arrayRemove(contentId),
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
  const enrollmentQuery = query(enrollmentsRef, where("status", "==", "approved"));
  const snapshot = await getDocs(enrollmentQuery);
  return snapshot.size;
}

export async function getPendingEnrollmentCount(): Promise<number> {
  const enrollmentsRef = collection(db, "enrollments");
  const enrollmentQuery = query(enrollmentsRef, where("status", "==", "pending"));
  const snapshot = await getDocs(enrollmentQuery);
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
    // Omit the key entirely when there is no limit: the Firestore Web SDK
    // rejects explicit `undefined` field values unless ignoreUndefinedProperties
    // is enabled (it is not — see initializeFirestore in src/lib/firebase.ts),
    // so the previous `undefined` payload made saving a limit-less quiz throw.
    ...(quizData.timeLimit !== undefined && quizData.timeLimit !== null
      ? { timeLimit: quizData.timeLimit }
      : {}),
    randomizeQuestionOrder: quizData.randomizeQuestionOrder ?? false,
    randomizeAnswerOrder: quizData.randomizeAnswerOrder ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return quizRef.id;
}

/**
 * Gets all quizzes for a course — ⚠️ ADMIN-ONLY at runtime.
 *
 * Firestore rules restrict quiz reads to admins (quizzes contain the answer
 * key). Student-facing code must use the `getQuizForStudent` callable
 * (functions/src/quizzes.ts), which strips correctAnswerIndex/explanation.
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
    // An absent/null limit means "clear it": with {merge: true} the stored
    // value must be removed via deleteField() — an explicit `undefined` both
    // throws in the Web SDK and would leave the old limit in place.
    timeLimit: updates.timeLimit !== undefined && updates.timeLimit !== null
      ? updates.timeLimit
      : deleteField(),
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

export async function getAllProgressForCourse(courseId: string): Promise<CourseProgress[]> {
  const progressRef = collection(db, "progress");
  const progressQuery = query(progressRef, where("courseId", "==", courseId));
  const snapshot = await getDocs(progressQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CourseProgress));
}

export function isAdminProfile(profile: UserProfile | null) {
  return profile?.role === "admin";
}

/* -------------------------------------------------------------------------- */
/*  Checklist lead-magnet enquiries                                           */
/* -------------------------------------------------------------------------- */

export interface ChecklistEnquiryInput {
  name: string;
  email: string;
  phone: string;
  challenge: string;
}

/**
 * Persists a checklist enquiry submitted from the public /checklist page.
 * Submissions are anonymous (no auth), so the `checklistEnquiries` Firestore
 * rule validates field shapes and size caps instead of relying on
 * authentication. Returns the created document id.
 */
export async function createChecklistEnquiry(input: ChecklistEnquiryInput): Promise<string> {
  const enquiryRef = await addDoc(collection(db, "checklistEnquiries"), {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    challenge: input.challenge.trim(),
    source: "checklist-landing",
    createdAt: serverTimestamp(),
  });
  return enquiryRef.id;
}
