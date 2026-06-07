# How Admins See Quiz Analytics - Step-by-Step Guide

## Accessing Quiz Analytics

### Step 1: Navigate to Course Management
- Log in as an admin user
- Go to the main admin dashboard (`/admin`)
- Click on "Course Management" or "Courses" in the sidebar

### Step 2: Select a Specific Course
- Browse the list of courses
- Click on the course name you want to analyze
- This takes you to the course edit page

### Step 3: Access Analytics from Course Edit Page
On the course edit page, you'll see:
- A "View Analytics" button next to the "Add Quiz" button
- Click this button to go directly to the quiz analytics page

**Alternative route**: You can also navigate directly to:
`/admin/courses/[course-id]/quizzes`

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

1. **Admin clicks "View Analytics"** on a course edit page
2. **Dashboard loads** showing all quiz attempts for that course
3. **Admin filters** by a specific quiz or user if needed
4. **Admin clicks "View Details"** on any attempt to see the full answer breakdown
5. **Detailed view shows**:
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

This implementation provides admins with a complete picture of student performance and the ability to control quiz behavior as requested.