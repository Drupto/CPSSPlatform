# How to Create Quizzes in the CPSS Platform

This document explains how to create and manage quizzes within the CPSS Platform. Quizzes are an essential part of the learning experience, allowing students to test their knowledge and helping instructors assess comprehension.

## Overview

Quizzes in the CPSS Platform are designed to be integrated seamlessly into course content. They allow administrators to create assessment questions that students can take during their learning journey. The system tracks quiz attempts and stores results for future reference.

## Quiz Structure

Each quiz consists of:
- **Title**: A descriptive name for the quiz
- **Description**: A brief explanation of what the quiz covers
- **Pass Percentage**: Minimum score required to pass the quiz (default 70%)
- **Questions**: Multiple-choice questions with:
  - Question text
  - Multiple answer options
  - Correct answer index
  - Optional explanation for the correct answer

## Admin Side: Creating Quizzes

### Creating Quizzes After Course Creation

Quizzes cannot be added during the initial course creation form. The course must exist first because quiz data is stored in a Firestore subcollection under the course document: `courses/{courseId}/quizzes`.

### Step-by-Step Process

1. **Create the Course First**
   - Go to the admin panel (`/admin`)
   - Select "Courses" from the menu
   - Click "Create New Course"
   - Fill in course details such as title, description, price, and content sections
   - Click "Create Course"

2. **Open Quiz Creation**
   - After creating the course, navigate back to the Course Management page
   - Find the course row
   - Click **Add Quiz**
   - This opens the dedicated quiz creation page at `/admin/courses/[course-id]/quizzes/new`

   Alternatively, admins can open the course edit page, scroll to the "Quizzes" section, and click **Add New Quiz** to open the inline quiz form.

3. **Configure Quiz Details**
   - **Title**: Enter a descriptive name for the quiz
   - **Description**: Provide a brief overview of what the quiz covers
   - **Pass Percentage**: Set the minimum score required to pass (0-100%)
   - **Maximum Attempts**: Set how many times a learner can attempt the quiz
   - **Time Limit**: Optionally set a time limit in minutes
   - **Randomization**: Optionally randomize question or answer order

4. **Add Questions**
   - Click "Add Question" to create a new question
   - Enter the question text
   - Add answer options (minimum 2 required)
   - Select the correct answer using the radio button
   - Optionally add an explanation for the correct answer

5. **Manage Questions**
   - Add more questions as needed
   - Edit existing questions by modifying their content
   - Remove questions using the delete button

6. **Save the Quiz**
   - Click "Create Quiz"
   - The quiz is saved to `courses/{courseId}/quizzes`
   - After a short success message, the page redirects to the new quiz edit page for review

### Why This Limitation Exists

The current implementation requires a course to exist before quizzes can be added because:
- Quizzes are stored in a subcollection of the course document in Firestore (`courses/{courseId}/quizzes`)
- The course ID is needed to create this subcollection
- The "New Course" form focuses on basic course information and content sections
- Quiz creation is intentionally separated to ensure proper data structure

### Alternative Approach

If you need to create quizzes immediately after creating a course, you can:
1. Create the course with minimal content
2. Return to Course Management
3. Click **Add Quiz** for that course
4. Complete the quiz form on the dedicated quiz creation page

## Technical Implementation

### Database Structure

Quizzes are stored in Firebase Firestore with the following structure:

```typescript
interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  passPercentage: number;
  questions: QuizQuestion[];
  maxAttempts?: number;
  timeLimit?: number;
  randomizeQuestionOrder?: boolean;
  randomizeAnswerOrder?: boolean;
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
  answers: number[];
  score: number;
  passed: boolean;
  completedAt: Timestamp | null;
}
```

### Key Functions

The platform provides several utility functions for quiz management in `src/lib/course.ts`:
- `createQuiz(courseId, quizData)` - Creates a new quiz for a course
- `getCourseQuizzes(courseId)` - Retrieves all quizzes for a course
- `updateQuiz(quizId, updates)` - Updates an existing quiz
- `deleteQuiz(quizId, courseId)` - Deletes a quiz
- `createQuizAttempt(attemptData)` - Records a quiz attempt
- `getCourseQuizAttempts(userId, courseId)` - Gets all quiz attempts for a user in a course

### Security Rules

Firestore rules are configured in `firestore.rules` and referenced by `firebase.json`.

Quiz rules:
- Authenticated admins can create, update, read, and delete quizzes under `courses/{courseId}/quizzes/{quizId}`
- Authenticated learners can read published course quizzes
- Students can create and read their own quiz attempts
- Admins can read and manage all quiz attempts

## Student Side: Taking Quizzes

### How Students Access Quizzes

1. **Enroll in a Course**
   - Students must first enroll in a course that contains quizzes

2. **Navigate to Course Learning**
   - Go to the course learning page (`/courses/{slug}/learn`)

3. **Find Quizzes in Course Outline**
   - Quizzes appear in the right sidebar under "Course Outline"
   - Completed quizzes are marked with a green checkmark
   - Unattempted quizzes show a "Q" icon

4. **Take a Quiz**
   - Click on a quiz in the sidebar to open the quiz modal
   - Answer all questions by clicking on options
   - Submit the quiz when finished
   - View results immediately after submission

### Quiz Experience

- **Interactive Interface**: Students can select answers and see immediate visual feedback
- **Results Display**: Shows score percentage and pass/fail status
- **Explanations**: Correct answers are displayed with explanations when available
- **Retake Option**: Students can retake quizzes if the quiz allows multiple attempts

## Best Practices

1. **Clear Question Design**
   - Write questions that are unambiguous and focused
   - Ensure answer options are plausible but clearly distinguishable
   - Include explanations for correct answers to enhance learning

2. **Appropriate Difficulty**
   - Set pass percentages that reflect the course's difficulty level
   - Balance between challenging and achievable assessments

3. **Regular Updates**
   - Update quizzes regularly to align with course content
   - Remove outdated questions and add new ones as needed

4. **Accessibility**
   - Ensure questions are readable and accessible
   - Provide clear instructions for quiz-taking

## Troubleshooting

### Common Issues

1. **Quiz Not Appearing to Students**
   - Verify the course is published
   - Check that the quiz has at least one question
   - Ensure the quiz has a valid title and description

2. **Quiz Not Saving**
   - Make sure all required fields are filled
   - Check that questions have at least 2 options
   - Confirm that a correct answer is selected for each question
   - Confirm Firestore rules allow admin quiz writes

3. **Results Not Saving**
   - Ensure the user is logged in
   - Verify that the quiz attempt is properly configured
   - Check that the user has enrolled in the course
   - Confirm Firestore rules allow the student to write their own quiz attempt

## Future Enhancements

The platform supports several potential enhancements for quizzes:
- Quiz timer functionality
- Randomized question/answer ordering
- Quiz categories/tags
- Quiz sharing between courses
- Advanced grading features (partial credit, etc.)

This implementation provides a solid foundation for creating and managing educational quizzes within the CPSS Platform.
