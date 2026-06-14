# Quiz Admin Features

This document outlines the admin features for quiz management that have been implemented in the CPSS Platform.

## Overview

The admin panel provides tools for creating quizzes, managing quiz settings, reviewing student answers, and monitoring student performance. These features enable administrators to create course assessments and track learning outcomes.

## Key Features

### 1. Quiz Creation

Admins can create quizzes in two ways:

- From Course Management, click **Add Quiz** for a course to open `/admin/courses/[course-id]/quizzes/new`
- From the course edit page, open the "Quizzes" section and click **Add New Quiz** to use the inline quiz form

The quiz creation form supports:
- Quiz title and description
- Pass percentage
- Maximum attempts
- Optional time limit
- Question and answer randomization
- Multiple-choice questions with explanations

### 2. Quiz Analytics Dashboard
- View all quiz attempts for a course
- Filter results by quiz or user
- See overall statistics including total attempts, average scores, and pass rates
- Open detailed results for individual quizzes

### 3. Quiz Settings Control
- **Maximum Attempts**: Configure whether quizzes can be taken once or multiple times
- **Time Limits**: Set time limits for quiz completion in minutes
- **Randomization Options**: Enable randomization of question and answer orders
- **Pass Percentage**: Set the minimum score required to pass a quiz

### 4. Detailed Quiz Results Review
- View individual user answers compared to correct answers
- See which questions were answered correctly or incorrectly
- Review explanations for correct answers
- Use visual highlighting for correct and incorrect selections

## Implementation Details

### Database Changes
- Extended the `Quiz` interface to include new settings fields:
  - `maxAttempts?: number`
  - `timeLimit?: number`
  - `randomizeQuestionOrder?: boolean`
  - `randomizeAnswerOrder?: boolean`

### New Pages
1. **Create Quiz Page** (`/admin/courses/[id]/quizzes/new`)
   - Dedicated page for creating a new quiz for a course
   - Opens from Course Management via the "Add Quiz" link

2. **Quiz Analytics Page** (`/admin/courses/[id]/quizzes`)
   - Displays all quiz attempts for a course
   - Shows statistics and filtering capabilities
   - Provides links to detailed results

3. **Detailed Results Page** (`/admin/courses/[id]/quizzes/[quizId]`)
   - Shows comprehensive breakdown of individual quiz attempts
   - Displays user answers vs correct answers
   - Shows explanations for correct answers

### Admin Interface Updates
- Added quiz creation route from Course Management
- Enhanced quiz editing form in course management
- Added quiz settings controls to the quiz creation/editing flow
- Added navigation links between course management and quiz analytics
- Isolated quiz form buttons from the parent course edit form to prevent accidental course saves

## Usage Instructions

### For Admins

1. **Create a Quiz**
   - Navigate to the Course Management page
   - Click **Add Quiz** for the desired course
   - Complete the quiz form and click **Create Quiz**

2. **Access Quiz Analytics**
   - Navigate to the course management page
   - Click **View Analytics** for the course or go directly to `/admin/courses/[course-id]/quizzes`

3. **Review Quiz Results**
   - View summary statistics on the main analytics page
   - Filter results by quiz or user
   - Click **View Details** to see individual attempt breakdowns

4. **Configure Quiz Settings**
   - Create or edit a quiz
   - Set maximum attempts, optional time limits, randomization options, and pass percentage
   - Save the quiz

### For Students

1. **Taking Quizzes**
   - Students can take quizzes according to the configured settings
   - If maximum attempts is set to 1, they can only take the quiz once
   - If time limits are set, quizzes will automatically submit when time expires
   - Randomization affects question and answer order for each attempt

2. **Viewing Results**
   - After completing a quiz, students see their score and pass/fail status
   - Correct answers are shown with explanations
   - Students can retake quizzes if allowed by the settings

## Security Considerations

- Only authenticated admin users can access quiz creation, editing, and analytics
- Quiz attempts are securely stored with user identification
- Admin quiz writes are secured through Firestore rules under `courses/{courseId}/quizzes/{quizId}`
- Students can create and read only their own quiz attempts
- All quiz settings are validated before saving to prevent invalid configurations

## Future Enhancements

- Export quiz results to CSV format
- Advanced grading features such as partial credit
- Quiz scheduling and availability controls
- Integration with learning analytics dashboards
