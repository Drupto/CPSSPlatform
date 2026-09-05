import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { startQuizAttempt as startQuizAttemptRaw, submitQuizAttempt as submitQuizAttemptRaw } from "./quiz-attempts";
import { getQuizForStudent as getQuizForStudentRaw } from "./quizzes";

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Deletes every document matching the given Firestore query using a BulkWriter.
 *
 * BulkWriter is used instead of fixed batches because Firestore batches are
 * capped at 500 operations — a course with more than 500 quizzes/content items/
 * resources would make a single batch commit fail (and, with `retry: true`,
 * fail forever). BulkWriter transparently chunks past the limit, throttles,
 * and retries transient errors with exponential backoff.
 *
 * Returns the number of documents deleted.
 */
async function deleteAllDocs(query: admin.firestore.Query<admin.firestore.DocumentData>): Promise<number> {
  const snapshot = await query.get();
  if (snapshot.empty) {
    return 0;
  }

  const writer = admin.firestore().bulkWriter();
  writer.onWriteError((error) => {
    // Retry transient failures up to 3 attempts; otherwise surface the error
    // so the trigger event is retried (all operations are idempotent).
    return error.failedAttempts < 3;
  });

  snapshot.docs.forEach((doc) => {
    void writer.delete(doc.ref);
  });

  await writer.close();
  return snapshot.size;
}

/**
 * Cloud Function triggered when a course document is deleted (Gen 2).
 * This function handles cascading deletion of all related data:
 * - Quizzes, content items, and resources (course subcollections)
 * - Orphaned quiz attempts and quiz sessions (top-level collections)
 * - Associated storage files under courses/{courseId}/
 *
 * Retries are enabled so transient failures don't leave orphaned data behind.
 * All operations are idempotent — deleting already-deleted docs/files is a
 * no-op (storage deletes use ignoreNotFound).
 */
export const onCourseDelete = onDocumentDeleted(
  {
    document: "courses/{courseId}",
    retry: true,
    // Large courses can have thousands of files/docs; the default 60s/256MiB
    // is too tight for the cleanup pass.
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (event) => {
    const courseId = event.params.courseId;

    if (!courseId) {
      console.error("onCourseDelete triggered without courseId — skipping");
      return;
    }

    const db = admin.firestore();
    console.log(`Starting cleanup for course: ${courseId}`);

    // 1. Course subcollections: quizzes, content items, resources
    const quizzesDeleted = await deleteAllDocs(db.collection(`courses/${courseId}/quizzes`));
    console.log(`Deleted ${quizzesDeleted} quizzes for course: ${courseId}`);

    const contentDeleted = await deleteAllDocs(db.collection(`courses/${courseId}/content`));
    console.log(`Deleted ${contentDeleted} content items for course: ${courseId}`);

    const resourcesDeleted = await deleteAllDocs(db.collection(`courses/${courseId}/resources`));
    console.log(`Deleted ${resourcesDeleted} resources for course: ${courseId}`);

    // 2. Orphaned top-level records referencing the deleted course
    const attemptsDeleted = await deleteAllDocs(
      db.collection("quizAttempts").where("courseId", "==", courseId)
    );
    console.log(`Deleted ${attemptsDeleted} quiz attempts for course: ${courseId}`);

    const sessionsDeleted = await deleteAllDocs(
      db.collection("quizSessions").where("courseId", "==", courseId)
    );
    console.log(`Deleted ${sessionsDeleted} quiz sessions for course: ${courseId}`);

    // 3. Associated storage files (auto-paginates; deletes are idempotent)
    console.log(`Deleting storage files for course: ${courseId}`);
    const bucket = admin.storage().bucket();
    const courseFilesPrefix = `courses/${courseId}/`;

    const [files] = await bucket.getFiles({ prefix: courseFilesPrefix });

    if (files.length > 0) {
      // Bounded parallelism instead of one giant Promise.all.
      const CHUNK_SIZE = 50;
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map((file) => file.delete({ ignoreNotFound: true })));
      }
      console.log(`Deleted ${files.length} storage files for course: ${courseId}`);
    }

    console.log(`Cleanup completed for course: ${courseId}`);
  }
);

// Quiz attempt functions
export const startQuizAttempt = startQuizAttemptRaw;
export const submitQuizAttempt = submitQuizAttemptRaw;
export const getQuizForStudent = getQuizForStudentRaw;