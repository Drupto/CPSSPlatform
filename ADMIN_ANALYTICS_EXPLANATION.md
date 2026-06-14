# How Admins See Quiz Analytics - Step-by-Step Guide

## Accessing Quiz Analytics

### Step 1: Navigate to Course Management
- Log in as an admin user
- Go to the main admin dashboard (`/admin`)
- Click on "Course Management" or "Courses" in the sidebar

### Step 2: Select a Course Row
- Browse the list of courses
- Use the course row for the course you want to analyze

### Step 3: Access Analytics
On the course row, you can:
- Click **View Analytics** to go directly to `/admin/courses/[course-id]/quizzes`
- Click **Add Quiz** to create a new quiz for the course
- Click **Edit Course** to open the course edit page

**Alternative route**: You can also navigate directly to:
`/admin/courses/[course-id]/quizzes`

### Step 4: Access Quiz Creation
- Click **Add Quiz** from Course Management to open `/admin/courses/[course-id]/quizzes/new`
- Or open the course edit page, scroll to the "Quizzes" section, and click **Add New Quiz**

## What Admins See in the Analytics Dashboard

### Main Analytics Page (`/admin/courses/[id]/quizzes`)
1. **Statistics Overview**:
   - Total quiz attempts
   - Average score percentage
   - Pass rate percentage
   - Average time spent (coming soon)

2. **Filtering Options**:
   - Filter by specific quiz
   - Filter by specific user
   - Clear filters button

3. **Quiz Attempts Table**:
   - User name and email
   - Quiz title
   - Score percentage
   - Pass/fail status
   - Date taken
   - Action buttons (View Details)

### Detailed Results Page (`/admin/courses/[id]/quizzes/[quizId]`)
1. **User-Specific Analysis**:
   - Individual user attempt details
   - Question-by-question breakdown
   - Visual comparison of selected vs correct answers
   - Explanations for correct answers

2. **Visual Features**:
   - Green highlighting for correct answers
   - Red highlighting for incorrect answers
   - Clear indication of which options were selected
   - Explanations for each correct answer

## Example Workflow

1. **Admin opens Course Management**
2. **Admin clicks "Add Quiz"** to create a new quiz, or **View Analytics** to review attempts
3. **If creating a quiz**, the admin completes the quiz form and saves it
4. **If reviewing analytics**, the dashboard loads all quiz attempts for that course
5. **Admin filters** by a specific quiz or user if needed
6. **Admin clicks "View Details"** on any attempt to see the full answer breakdown
7. **Detailed view shows**:
   - User's selected answers
   - Correct answers
   - Explanations for correct answers
   - Visual indicators of correctness

## Key Features for Admins

### Score Visibility
- All scores displayed as percentages
- Clear pass/fail indicators
- Average statistics for quick overview

### Answer Review
- Side-by-side comparison of user answers vs correct answers
- Color-coded feedback (green for correct, red for incorrect)
- Visual distinction of selected options

### Explanation Access
- Each correct answer shows its explanation
- Clear formatting of explanations
- Easy-to-read question-answer layout

### Settings Control
- Maximum attempts configurable (1 for single, >1 for multiple)
- Time limits for quizzes
- Randomization options for fairness
- Pass percentage settings

### Quiz Creation
- Dedicated create page from Course Management
- Inline create form from the course edit page
- Quiz form actions are isolated so quiz creation does not submit the parent course edit form

This implementation provides admins with a complete picture of student performance and the ability to create, manage, and control quiz behavior as requested.
