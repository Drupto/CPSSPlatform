# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the CPSS Platform.

## onCourseDelete Function

The `onCourseDelete` function is triggered whenever a course document is deleted from the Firestore `courses` collection. It automatically handles cascading deletions to ensure data consistency:

### What it does:
1. **Deletes all quizzes** from the `courses/{courseId}/quizzes` subcollection
2. **Deletes all content items** from the `courses/{courseId}/content` subcollection  
3. **Deletes all resources** from the `courses/{courseId}/resources` subcollection
4. **Logs cleanup operations** for monitoring and debugging

### Safety Features:
- Uses Firestore batches for efficient and atomic operations
- Includes comprehensive error handling
- Logs all operations for monitoring
- Does not throw errors that would prevent the original course deletion
- Checks if course still exists before attempting cleanup

### Cost Considerations:
- Batch operations minimize Firestore read/write operations
- Designed to be efficient and avoid unnecessary operations
- Logging helps monitor usage patterns

## Deployment

To deploy these functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

## Development

To run functions locally for testing:

```bash
cd functions
npm install
firebase emulators:start --only functions