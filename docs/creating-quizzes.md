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

### Creating Quizzes During Course Creation

When creating a new course, quizzes cannot be added directly during the initial creation process. This is because the course must first be created in order to have a course ID for storing quiz data in the database.

### Step-by-Step Process

1. **Create the Course First**
   - Go to the admin panel (`/admin`)
   - Select "Courses" from the menu
   - Click "Create New Course"
   - Fill in course details (title, description, price, etc.)
   - Add content sections to the course
   - Click "Create Course"

2. **Edit the Course to Add Quizzes**
   - After creating the course, navigate back to the course list
   - Click the "Edit" button for the course you just created
   - Scroll down to the "Quizzes" section in the course editor
   - This section appears below the course content sections

3. **Add a New Quiz**
   - Click the "Add Quiz" button
   - A new quiz form will appear with default values

4. **Configure Quiz Details**
   - **Title**: Enter a descriptive name for the quiz
   - **Description**: Provide a brief overview of what the quiz covers
   - **Pass Percentage**: Set the minimum score required to pass (0-100%)

5. **Add Questions**
   - Click "Add Question" to create a new question
   - Enter the question text
   - Add answer options (minimum 2 required)
   - Select the correct answer using the radio button
   - Optionally add an explanation for the correct answer

6. **Manage Questions**
   - Add more questions as needed
   - Edit existing questions by modifying their content
   - Remove questions using the delete button
   - Reorder questions using the up/down arrows

7. **Save Changes**
   - Click "Save Changes" at the bottom of the page
   - The quiz will be saved to the course and become available to students

### Why This Limitation Exists

The current implementation requires a course to exist before quizzes can be added because:
- Quizzes are stored in a subcollection of the course document in Firestore (`courses/{courseId}/quizzes`)
- The course ID is needed to create this subcollection
- The "New Course" form focuses on basic course information and content sections
- Quiz creation is intentionally separated to ensure proper data structure

### Alternative Approach

If you need to create quizzes immediately upon course creation, you can:
1. Create the course with minimal content
2. Immediately edit the course to add quizzes
3. Or create a course with placeholder content and then add quizzes in the edit screen

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

### Key Functions

The platform provides several utility functions for quiz management in `src/lib/course.ts`:

- `createQuiz(courseId, quizData)` - Creates a new quiz for a course
- `getCourseQuizzes(courseId)` - Retrieves all quizzes for a course
- `updateQuiz(quizId, updates)` - Updates an existing quiz
- `deleteQuiz(quizId, courseId)` - Deletes a quiz
- `createQuizAttempt(attemptData)` - Records a quiz attempt
- `getCourseQuizAttempts(userId, courseId)` - Gets all quiz attempts for a user in a course

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
- **Retake Option**: Students can retake quizzes to improve their scores

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

3. **Results Not Saving**
   - Ensure the user is logged in
   - Verify that the quiz attempt is properly configured
   - Check that the user has enrolled in the course

## Future Enhancements

The platform supports several potential enhancements for quizzes:
- Quiz timer functionality
- Randomized question/answer ordering
- Quiz categories/tags
- Quiz sharing between courses
- Advanced grading features (partial credit, etc.)

This implementation provides a solid foundation for creating and managing educational quizzes within the CPSS Platform.