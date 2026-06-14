# Separate Add Quiz and Edit Quiz Actions Plan

## Goal

Split the current combined quiz create/edit flow into two clearly separated admin actions:

- **Add Quiz** → create a new quiz for a course.
- **Edit Quiz** → update an existing quiz for a course.

The UI should make the two actions visually and functionally distinct, and routing should make the selected action obvious.

## Current Flow

Current relevant files:

- `src/app/admin/courses/page.tsx:92-97`
  - Course management row currently has a single text link labeled `Add/Edit Quiz`.
  - It redirects to `/admin/courses/${course.id}/quizzes/new`.
- `src/app/admin/courses/[id]/quizzes/new/page.tsx`
  - This page currently handles both actions.
  - It loads existing quizzes at lines 87-89.
  - It renders existing quiz cards at lines 256-299.
  - It renders the create/edit form at lines 303-484.
  - It decides create vs edit by checking `?quizId=` at lines 95-100.
- `src/app/admin/courses/[id]/edit/page.tsx:459-509`
  - Course edit page already has an `Edit Quiz` button for each existing quiz.
  - It redirects to `/admin/courses/${courseId}/quizzes/new?quizId=${quiz.id}`.
- `src/lib/course.ts:341-397`
  - `createQuiz()` creates quizzes under `courses/{courseId}/quizzes`.
  - `updateQuiz()` updates an existing quiz but currently relies on `updates.courseId!`.

## Proposed Route Map

Keep existing analytics/detail routes and add a dedicated edit route:

| Action | Route | Purpose |
|---|---|---|
| Add Quiz | `/admin/courses/[id]/quizzes/new` | Create-only quiz form |
| Edit Quiz | `/admin/courses/[id]/quizzes/[quizId]/edit` | Edit existing quiz form |
| Quiz Analytics | `/admin/courses/[id]/quizzes` | View attempts/results |
| Quiz Detail Results | `/admin/courses/[id]/quizzes/[quizId]` | Review attempt answers |

This avoids overloading `/quizzes/new?quizId=...` and makes the action explicit in the URL.

## UI Placement Plan

### 1. Course Management Page

Update `src/app/admin/courses/page.tsx` around lines 92-97.

Replace:

- `View Analytics`
- `Add/Edit Quiz`

With clearly separated controls:

- `Add Quiz`
  - Primary or outline button.
  - Redirects to `/admin/courses/${course.id}/quizzes/new`.
- `Edit Quiz`
  - Outline button.
  - Redirects to `/admin/courses/${course.id}/quizzes/edit` if implementing a quiz selector page, or to `/admin/courses/${course.id}/quizzes/[quizId]/edit` if editing a specific quiz.

Recommended course-management behavior:

- Always show **Add Quiz**.
- If the course has no quizzes, either:
  - disable **Edit Quiz**, or
  - redirect to an edit page that shows an empty state.
- If the course has quizzes, **Edit Quiz** should open a page where the admin can select or choose an existing quiz.

### 2. Course Edit Page

Update `src/app/admin/courses/[id]/edit/page.tsx` around lines 459-509.

Recommended behavior:

- Top of Quizzes section:
  - `Add Quiz` button → `/admin/courses/${courseId}/quizzes/new`.
- For each existing quiz card:
  - `Edit Quiz` → `/admin/courses/${courseId}/quizzes/${quiz.id}/edit`.
  - `View Analytics` remains `/admin/courses/${courseId}/quizzes`.

### 3. Add Quiz Page

Refactor `src/app/admin/courses/[id]/quizzes/new/page.tsx` into an add-only page.

Expected behavior:

- Admin auth check remains.
- Loads course by `courseId`.
- Shows empty quiz form.
- Does not show existing quiz cards in the main action area.
- Save button label: `Create Quiz`.
- Header copy: `Add Quiz` / `Create a new quiz for [course title]`.
- After success, redirect to `/admin/courses/${courseId}/quizzes`.

Optional: include a small secondary link like `View existing quizzes` to `/admin/courses/${courseId}/quizzes/edit`, but do not mix existing quiz cards into the add form.

### 4. Edit Quiz Page

Create a new page:

- `src/app/admin/courses/[id]/quizzes/[quizId]/edit/page.tsx`

Expected behavior:

- Admin auth check remains.
- Load course by `courseId`.
- Load quiz by `quizId` and `courseId`.
- If course is missing, show `Course not found`.
- If quiz is missing, show `Quiz not found`.
- Preload the form with the selected quiz data.
- Save button label: `Update Quiz`.
- Header copy: `Edit Quiz` / `Editing quiz for [course title]`.
- After success, redirect to `/admin/courses/${courseId}/quizzes`.

## Shared Component Refactor

The current add/edit page is large and mixes routing, auth, existing quiz cards, form state, and question editing.

Recommended refactor:

- Create a shared component, for example:
  - `src/components/admin/quizzes/QuizForm.tsx`
  - or `src/components/quiz-form.tsx`
- Move the quiz form logic into that component:
  - quiz details
  - pass percentage
  - max attempts
  - time limit
  - randomization toggles
  - question list
  - answer options
  - explanation
  - save/cancel behavior
- The Add Quiz page passes:
  - `mode="create"`
  - `courseId`
  - empty initial quiz state
- The Edit Quiz page passes:
  - `mode="edit"`
  - `courseId`
  - `quizId`
  - loaded quiz state

This avoids duplicating the 500-line form between add and edit pages.

## Data Layer Changes

Recommended changes in `src/lib/course.ts`:

1. Keep `createQuiz(courseId, quizData)`.
2. Change or wrap `updateQuiz` so the course ID is explicit and not read from form state.

Preferred signature:

```ts
updateQuiz(courseId: string, quizId: string, updates: Partial<Quiz>): Promise<void>
```

Reason:

- Prevents accidental cross-course updates.
- Makes the edit route safer.
- Avoids relying on client-provided `updates.courseId`.

If keeping the existing signature temporarily, ensure the edit page passes `courseId` inside `updates` and validates the loaded quiz belongs to the current course.

## Validation Requirements

Add validation before create/update:

- Quiz title is required.
- At least one question is required.
- Each question text is required.
- Each question has at least two options.
- Each option is non-empty.
- Correct answer index is valid.
- `passPercentage` is between 0 and 100.
- `maxAttempts` is at least 1.
- `timeLimit`, if provided, is at least 0.

This should replace the current behavior where only the title is checked.

## Existing Quiz Cards

Move the existing quiz cards from the current combined page into the Edit Quiz flow.

Recommended edit page structure:

1. Header: `Edit Quiz`
2. Existing quizzes section:
   - list all quizzes for the course
   - each card has `Edit` and `Analytics`
   - current quiz is visually highlighted
3. Edit form:
   - preloaded with selected quiz data
   - save updates that quiz

This makes the edit action discoverable without confusing it with add.

## Related Cleanup

While touching the quiz admin flow, fix the active analytics page bug:

- `src/app/admin/courses/[id]/quizzes/page.tsx:103`
  - Calls a local `getCourseQuizzes` function.
- `src/app/admin/courses/[id]/quizzes/page.tsx:152-155`
  - Local placeholder always returns `[]`.
  - This shadows the imported `getCourseQuizzes`.
- Remove the local placeholder and use the imported `getCourseQuizzes` from `src/lib/course.ts`.

Also review:

- `src/app/admin/courses/[id]/quizzes/page.tsx:107`
  - Currently fetches attempts using `currentUser.uid`, which is the admin user.
  - For course analytics, this should fetch attempts for all users in the course, or use a backend/admin-capable query if Firestore rules require it.

## Permissions

Keep admin-only access on all quiz admin pages:

- Add Quiz page
- Edit Quiz page
- Quiz Analytics page
- Quiz Detail Results page

Each page should:

1. Listen to auth state.
2. Redirect unauthenticated users to `/auth`.
3. Load the user profile.
4. Redirect non-admins away from admin pages.
5. Verify the course exists.
6. For Edit Quiz, verify the quiz exists and belongs to the course.

## Implementation Steps

1. Refactor the current quiz form into a shared `QuizForm` component.
2. Convert `src/app/admin/courses/[id]/quizzes/new/page.tsx` into an add-only page.
3. Add `src/app/admin/courses/[id]/quizzes/[quizId]/edit/page.tsx`.
4. Move existing quiz cards into the edit page or an edit-selector page.
5. Update `src/app/admin/courses/page.tsx` to show separate `Add Quiz` and `Edit Quiz` buttons.
6. Update `src/app/admin/courses/[id]/edit/page.tsx` quiz buttons to use the new edit route.
7. Add validation to the shared quiz form.
8. Update `src/lib/course.ts` update helper to accept explicit `courseId` and `quizId`.
9. Remove the placeholder `getCourseQuizzes` from the analytics page.
10. Run `npm run typecheck`.

## Manual Verification Checklist

- Admin clicks **Add Quiz** from course management:
  - Redirects to `/admin/courses/[id]/quizzes/new`.
  - Form is empty.
  - Save button says `Create Quiz`.
  - Existing quiz cards are not mixed into the add form.
- Admin clicks **Edit Quiz**:
  - Redirects to edit route for an existing quiz.
  - Form is preloaded with existing quiz data.
  - Save button says `Update Quiz`.
- Admin saves a new quiz:
  - New quiz appears in existing quiz list.
  - Redirects to analytics page.
- Admin saves an existing quiz:
  - Existing quiz updates without creating a duplicate.
  - Redirects to analytics page.
- Non-admin user opens add/edit route:
  - Redirects away.
- Missing course or quiz ID:
  - Shows a clear error state.
- Typecheck passes with `npm run typecheck`.
