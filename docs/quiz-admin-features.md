# Quiz Admin Features

This document outlines the new admin features for quiz management that have been implemented in the CPSS Platform.

## Overview

The admin panel now provides comprehensive tools for managing quiz results, reviewing student answers, and controlling quiz settings. These features enable administrators to monitor student performance and customize quiz experiences.

## Key Features

### 1. Quiz Analytics Dashboard
- View all quiz attempts for a course
- Filter results by quiz or user
- See overall statistics including total attempts, average scores, and pass rates
- Detailed view of individual quiz results

### 2. Quiz Settings Control
- **Maximum Attempts**: Configure whether quizzes can be taken only once or multiple times
- **Time Limits**: Set time limits for quiz completion (in minutes)
- **Randomization Options**: Enable randomization of question and answer orders
- **Pass Percentage**: Set the minimum score required to pass a quiz

### 3. Detailed Quiz Results Review
- View individual user answers compared to correct answers
- See which questions were answered correctly or incorrectly
- Review explanations for correct answers
- Visual highlighting of correct/incorrect selections

## Implementation Details

### Database Changes
- Extended the `Quiz` interface to include new settings fields:
  - `maxAttempts?: number`
  - `timeLimit?: number`
  - `randomizeQuestionOrder?: boolean`
  - `randomizeAnswerOrder?: boolean`

### New Pages
1. **Quiz Analytics Page** (`/admin/courses/[id]/quizzes`)
   - Displays all quiz attempts for a course
   - Shows statistics and filtering capabilities
   - Provides links to detailed results

2. **Detailed Results Page** (`/admin/courses/[id]/quizzes/[quizId]`)
   - Shows comprehensive breakdown of individual quiz attempts
   - Displays user answers vs correct answers
   - Shows explanations for correct answers

### Admin Interface Updates
- Enhanced quiz editing form in course management
- Added quiz settings controls to the quiz creation/editing flow
- Added navigation links between course management and quiz analytics

## Usage Instructions

### For Admins

1. **Access Quiz Analytics**
   - Navigate to the course management page
   - Click "View Analytics" in the quiz section or go directly to `/admin/courses/[course-id]/quizzes`

2. **Review Quiz Results**
   - View summary statistics on the main analytics page
   - Filter results by quiz or user
   - Click "View Details" to see individual attempt breakdowns

3. **Configure Quiz Settings**
   - Edit a course and navigate to the "Quizzes" section
   - Add or edit quiz settings:
     - Maximum attempts allowed
     - Time limit (optional)
     - Randomization options
   - Save changes to apply settings

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

- Only authenticated admin users can access quiz analytics
- Quiz attempts are securely stored with user identification
- Admins can only view quiz results for courses they manage
- All quiz settings are validated before saving to prevent invalid configurations

## Future Enhancements

- Export quiz results to CSV format
- Advanced grading features (partial credit, etc.)
- Quiz scheduling and availability controls
- Integration with learning analytics dashboards