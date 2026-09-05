# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the CPSS Platform.

## onCourseDelete Function

The `onCourseDelete` function is triggered whenever a course document is deleted from the Firestore `courses` collection. It automatically handles cascading deletions to ensure data consistency:

### What it does:
1. **Deletes all quizzes** from the `courses/{courseId}/quizzes` subcollection
2. **Deletes all content items** from the `courses/{courseId}/content` subcollection
3. **Deletes all resources** from the `courses/{courseId}/resources` subcollection
4. **Deletes orphaned quiz attempts** (`quizAttempts` where `courseId` matches)
5. **Deletes orphaned quiz sessions** (`quizSessions` where `courseId` matches)
6. **Deletes all storage files** under `courses/{courseId}/`

### Safety Features:
- Uses Firestore **BulkWriter** — transparently chunks past the 500-operation
  batch limit, throttles, and retries transient errors with backoff
- Event-level retries enabled (`retry: true`); every operation is **idempotent**
  (deleting an already-deleted doc/file is a no-op; storage deletes use
  `ignoreNotFound`)
- Configured with `timeoutSeconds: 540` / `memory: 512MiB` for large courses
- Bounded-parallelism (50 at a time) storage deletes
- All operations logged for monitoring

### Deployment note (first deploy only)
The CLI requires acknowledging the retry/failure policy the first time a
retry-enabled function is deployed. Non-interactive deploys need:

```bash
firebase deploy --only functions --force
```

Subsequent deploys do not need `--force`. The `--force` is safe here because
the function is fully idempotent.

## Deployment

To deploy these functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

`firebase.json` includes a `predeploy` hook that compiles TypeScript, and
`deploy.sh` also builds explicitly — stale `lib/` output is never shipped.

## Development

To run functions locally for testing:

```bash
cd functions
npm install
firebase emulators:start --only functions