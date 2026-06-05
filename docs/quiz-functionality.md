# Quiz Functionality Documentation

This document describes the implementation of MCQ quiz functionality for the CPSS Platform course creation process.

## Overview

The quiz functionality allows administrators to create multiple-choice quizzes for courses and enables students to take those quizzes during their learning journey.

## Features Implemented

### Admin Side (Admin Panel)
1. **Quiz Creation Interface**
   - Add multiple quizzes to a course
   - Define quiz title, description, and pass percentage
   - Add questions with multiple-choice options
   - Set correct answers for each question
   - Add explanations for correct answers

2. **Quiz Management**
   - Edit existing quizzes
   - Delete quizzes
   - View quiz details

### Student Side (Learning Interface)
1. **Quiz Access**
   - Quizzes appear in the course outline sidebar
   - Visual indicators for passed/failed quizzes
   - Score tracking for completed quizzes

2. **Quiz Taking Experience**
   - Interactive quiz interface with multiple-choice questions
   - Real-time answer selection
   - Immediate feedback on answers
   - Score calculation and pass/fail determination
   - Results display with explanations

3. **Quiz Results**
   - Score percentage display
   - Pass/fail status
   - Review of correct answers with explanations
   - Option to retake quizzes

## Database Schema Changes

### New Collections
1. **courses/{courseId}/quizzes** - Stores quiz data for each course
2. **quizAttempts** - Stores user quiz attempt results

### Quiz Document Structure
```typescript
interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  passPercentage: number;
  questions: QuizQuestion[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  courseId: string;
  answers: number[]; // Array of selected answer indices
  score: number; // Percentage score
  passed: boolean;
  completedAt: Timestamp | null;
}
```

## Implementation Details

### Admin Interface
- Added quiz section to `/src/app/admin/courses/[id]/edit/page.tsx`
- Implemented CRUD operations for quizzes using Firebase Firestore
- Created intuitive UI for quiz creation with question management

### Student Interface
- Enhanced `/src/app/courses/[slug]/learn/page.tsx` with quiz functionality
- Added quiz modal component for taking quizzes
- Integrated quiz results display with explanations
- Implemented progress tracking for quiz attempts

### Backend Functions
- Added new functions in `/src/lib/course.ts`:
  - `createQuiz()`
  - `getCourseQuizzes()`
  - `updateQuiz()`
  - `deleteQuiz()`
  - `createQuizAttempt()`
  - `getCourseQuizAttempts()`

## Usage Instructions

### For Admins
1. Navigate to the course editing page (`/admin/courses/{id}/edit`)
2. Scroll to the "Quizzes" section
3. Click "Add Quiz" to create a new quiz
4. Fill in quiz details (title, description, pass percentage)
5. Add questions with options and set correct answers
6. Save the course to persist the quizzes

### For Students
1. Enroll in a course with quizzes
2. Navigate to the course learning page (`/courses/{slug}/learn`)
3. Complete course content sections
4. Find quizzes in the sidebar under "Course Outline"
5. Click on a quiz to start taking it
6. Select answers and submit when finished
7. View results and optionally retake the quiz

## Security Considerations
- Only authenticated users can take quizzes
- Quiz attempts are stored securely with user identification
- Admins can only create/edit quizzes for courses they manage
- Quiz results are tied to specific user IDs

## Future Enhancements
1. Quiz timer functionality
2. Randomized question/answer ordering
3. Quiz categories/tags
4. Quiz sharing between courses
5. Advanced grading features (partial credit, etc.)