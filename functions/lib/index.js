"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitQuizAttempt = exports.startQuizAttempt = exports.onCourseDelete = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const quiz_attempts_1 = require("./quiz-attempts");
// Initialize Firebase Admin SDK
admin.initializeApp();
/**
 * Cloud Function triggered when a course document is deleted (Gen 2).
 * This function handles cascading deletion of all related data:
 * - Quizzes in the quizzes subcollection
 * - Content items in the content subcollection
 * - Resources in the resources subcollection
 * - Associated storage files
 *
 * Retries are enabled so transient failures (Firestore or Storage) don't
 * leave orphaned data behind. All operations are idempotent — deleting
 * already-deleted docs/files is a no-op.
 */
exports.onCourseDelete = (0, firestore_1.onDocumentDeleted)({
    document: "courses/{courseId}",
    retry: true,
}, async (event) => {
    const courseId = event.params.courseId;
    if (!courseId) {
        console.error("onCourseDelete triggered without courseId — skipping");
        return;
    }
    console.log(`Starting cleanup for course: ${courseId}`);
    // 1. Delete all quizzes from the quizzes subcollection
    console.log(`Deleting quizzes for course: ${courseId}`);
    const quizzesRef = admin.firestore().collection(`courses/${courseId}/quizzes`);
    const quizzesSnapshot = await quizzesRef.get();
    if (!quizzesSnapshot.empty) {
        const batch = admin.firestore().batch();
        quizzesSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Deleted ${quizzesSnapshot.size} quizzes`);
    }
    // 2. Delete all content items from the content subcollection
    console.log(`Deleting content items for course: ${courseId}`);
    const contentRef = admin.firestore().collection(`courses/${courseId}/content`);
    const contentSnapshot = await contentRef.get();
    if (!contentSnapshot.empty) {
        const batch = admin.firestore().batch();
        contentSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Deleted ${contentSnapshot.size} content items`);
    }
    // 3. Delete all resources from the resources subcollection (if exists)
    console.log(`Deleting resources for course: ${courseId}`);
    const resourcesRef = admin.firestore().collection(`courses/${courseId}/resources`);
    const resourcesSnapshot = await resourcesRef.get();
    if (!resourcesSnapshot.empty) {
        const batch = admin.firestore().batch();
        resourcesSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Deleted ${resourcesSnapshot.size} resources`);
    }
    // 4. Delete associated storage files
    console.log(`Deleting storage files for course: ${courseId}`);
    const bucket = admin.storage().bucket();
    const courseFilesPrefix = `courses/${courseId}/`;
    const [files] = await bucket.getFiles({
        prefix: courseFilesPrefix,
    });
    if (files.length > 0) {
        const deletePromises = files.map((file) => file.delete());
        await Promise.all(deletePromises);
        console.log(`Deleted ${files.length} storage files`);
    }
    console.log(`Cleanup completed for course: ${courseId}`);
});
// Quiz attempt functions
exports.startQuizAttempt = quiz_attempts_1.startQuizAttempt;
exports.submitQuizAttempt = quiz_attempts_1.submitQuizAttempt;
//# sourceMappingURL=index.js.map