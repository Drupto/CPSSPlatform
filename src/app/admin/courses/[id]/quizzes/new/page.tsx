"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { 
  getCourseById,
  getUserProfile,
  isAdminProfile,
  createQuiz,
  getCourseQuizzes
} from "@/lib/course";
import type { Course, Quiz } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function CreateQuizPage() {
  const { id: courseId } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [quiz, setQuiz] = useState<Quiz>({
    id: '',
    courseId: courseId as string,
    title: '',
    description: '',
    passPercentage: 70,
    questions: [],
    maxAttempts: 1,
    timeLimit: undefined,
    randomizeQuestionOrder: false,
    randomizeAnswerOrder: false,
    createdAt: null,
    updatedAt: null
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }

      const profile = await getUserProfile(currentUser.uid);
      if (!isAdminProfile(profile)) {
        router.push("/");
        return;
      }

      if (!courseId) {
        setLoading(false);
        return;
      }

      try {
        const courseData = await getCourseById(courseId as string);
        if (!courseData) {
          setError("Course not found");
          setLoading(false);
          return;
        }

        setCourse(courseData);
        setLoading(false);
      } catch (err) {
        console.error("Error loading course:", err);
        setError("Failed to load course data");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [courseId, router]);

  const handleSave = async () => {
    if (!courseId) {
      setError("Course ID not found");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      // Create the quiz
      await createQuiz(courseId as string, {
        title: quiz.title,
        description: quiz.description,
        passPercentage: quiz.passPercentage,
        questions: quiz.questions,
        maxAttempts: quiz.maxAttempts,
        timeLimit: quiz.timeLimit,
        randomizeQuestionOrder: quiz.randomizeQuestionOrder,
        randomizeAnswerOrder: quiz.randomizeAnswerOrder
      });

      setSuccess("Quiz created successfully!");
      // Redirect to quiz analytics page after a delay
      setTimeout(() => {
        router.push(`/admin/courses/${courseId}/quizzes`);
      }, 1500);
    } catch (err) {
      console.error("Error creating quiz:", err);
      setError("Failed to create quiz. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: `new-q-${Date.now()}`,
      question: "",
      options: ["", ""],
      correctAnswerIndex: 0,
      explanation: ""
    };
    
    setQuiz({
      ...quiz,
      questions: [...quiz.questions, newQuestion]
    });
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const addQuestionOption = (questionIndex: number) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[questionIndex].options.push("");
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions.splice(index, 1);
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading course...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-red-100 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-700">{error}</p>
          <Button className="mt-4" onClick={() => router.push("/admin/courses")}>
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
            className="mb-4"
          >
            ← Back to Course
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Quiz</h1>
          <p className="text-slate-600">Create a new quiz for {course?.title}</p>
        </div>

        {success && (
          <div className="mb-6 rounded-2xl bg-emerald-100 border border-emerald-200 px-4 py-3 text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quiz-title">Quiz Title</Label>
                <Input
                  id="quiz-title"
                  value={quiz.title}
                  onChange={(e) => setQuiz({...quiz, title: e.target.value})}
                  placeholder="Enter quiz title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quiz-description">Description</Label>
                <Textarea
                  id="quiz-description"
                  value={quiz.description}
                  onChange={(e) => setQuiz({...quiz, description: e.target.value})}
                  placeholder="Enter quiz description"
                  rows={3}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pass-percentage">Pass Percentage</Label>
                  <Input
                    id="pass-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={quiz.passPercentage}
                    onChange={(e) => setQuiz({...quiz, passPercentage: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-attempts">Maximum Attempts</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    min="1"
                    max="100"
                    value={quiz.maxAttempts}
                    onChange={(e) => setQuiz({...quiz, maxAttempts: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="time-limit">Time Limit (minutes, optional)</Label>
                   <Input
                     id="time-limit"
                     type="number"
                     min="0"
                     value={quiz.timeLimit === undefined ? "" : quiz.timeLimit}
                     onChange={(e) => {
                       const value = e.target.value;
                       setQuiz({...quiz, timeLimit: value ? parseInt(value) : undefined});
                     }}
                   />
                </div>
                
                <div className="space-y-2">
                  <Label>Randomization Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="randomize-question-order"
                        checked={quiz.randomizeQuestionOrder || false}
                        onChange={(e) => setQuiz({...quiz, randomizeQuestionOrder: e.target.checked})}
                        className="mr-2 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="randomize-question-order">Randomize Question Order</Label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="randomize-answer-order"
                        checked={quiz.randomizeAnswerOrder || false}
                        onChange={(e) => setQuiz({...quiz, randomizeAnswerOrder: e.target.checked})}
                        className="mr-2 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="randomize-answer-order">Randomize Answer Order</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Questions</span>
                <Button type="button" variant="outline" onClick={addQuestion}>
                  Add Question
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quiz.questions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No questions added yet. Click "Add Question" to create your first question.
                </div>
              ) : (
                <div className="space-y-6">
                  {quiz.questions.map((question, qIndex) => (
                    <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Question {qIndex + 1}</h3>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                        >
                          Remove
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Question Text</Label>
                          <Textarea
                            value={question.question}
                            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                            placeholder="Enter the question"
                            rows={2}
                          />
                        </div>
                        
                        <div>
                          <Label>Answer Options</Label>
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2 mb-2">
                              <Input
                                value={option}
                                onChange={(e) => updateQuestionOption(qIndex, oIndex, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                              />
                              <input
                                type="radio"
                                name={`correct-answer-${qIndex}`}
                                checked={question.correctAnswerIndex === oIndex}
                                onChange={() => updateQuestion(qIndex, 'correctAnswerIndex', oIndex)}
                                className="h-4 w-4"
                              />
                              <span>Correct Answer</span>
                            </div>
                          ))}
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => addQuestionOption(qIndex)}
                          >
                            Add Option
                          </Button>
                        </div>
                        
                        <div>
                          <Label>Explanation (Optional)</Label>
                          <Textarea
                            value={question.explanation || ""}
                            onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                            placeholder="Explanation for the correct answer (optional)"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !quiz.title.trim()}
            >
              {isSaving ? "Creating Quiz..." : "Create Quiz"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}