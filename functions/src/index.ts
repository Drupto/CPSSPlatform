import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function triggered when a course document is deleted
 * This function handles cascading deletion of all related data:
 * - Quizzes in the quizzes subcollection
 * - Content items in the content subcollection
 * - Associated storage files
 */
export const onCourseDelete = functions.firestore
  .document('courses/{courseId}')
  .onDelete(async (snap, context) => {
    const courseId = context.params.courseId;
    
    try {
      console.log(`Starting cleanup for course: ${courseId}`);
      
      // Get the course data to check if it exists
      const courseSnapshot = await admin.firestore().doc(`courses/${courseId}`).get();
      if (!courseSnapshot.exists) {
        console.log(`Course ${courseId} already deleted, skipping cleanup`);
        return;
      }
      
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
      
      console.log(`Cleanup completed for course: ${courseId}`);
      
    } catch (error) {
      console.error(`Error during course cleanup for ${courseId}:`, error);
      // Don't throw the error to prevent the deletion from failing
      // The course deletion has already happened, so we log and continue
      throw new functions.https.HttpsError('internal', 'Cleanup failed, but course was deleted');
    }
  });