"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Quiz, QuizQuestion } from "@/lib/types";

interface QuizFormProps {
  mode: "create" | "edit";
  courseId: string;
  quizId?: string;
  initialQuiz?: Quiz;
  onSave: (quiz: Partial<Quiz>) => Promise<void>;
  isSaving: boolean;
}

export function QuizForm({ mode, courseId, quizId, initialQuiz, onSave, isSaving }: QuizFormProps) {
  const [quiz, setQuiz] = useState<Partial<Quiz>>({
    id: '',
    courseId: courseId,
    title: '',
    description: '',
    passPercentage: 70,
    questions: [],
    maxAttempts: 1,
    timeLimit: undefined,
    randomizeQuestionOrder: false,
    randomizeAnswerOrder: false,
    ...initialQuiz,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialQuiz) {
      setQuiz({
        ...initialQuiz,
        timeLimit: initialQuiz.timeLimit === null ? undefined : initialQuiz.timeLimit,
      });
    }
  }, [initialQuiz]);

  const validateQuiz = (): string | null => {
    if (!quiz.title?.trim()) {
      return "Quiz title is required";
    }
    if (!quiz.questions || quiz.questions.length === 0) {
      return "At least one question is required";
    }
    for (let i = 0; i < quiz.questions!.length; i++) {
      const q = quiz.questions![i];
      if (!q.question?.trim()) {
        return `Question ${i + 1}: Question text is required`;
      }
      if (!q.options || q.options.length < 2) {
        return `Question ${i + 1}: At least two answer options are required`;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j]?.trim()) {
          return `Question ${i + 1}, Option ${String.fromCharCode(65 + j)}: Answer option cannot be empty`;
        }
      }
      if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
        return `Question ${i + 1}: Invalid correct answer selection`;
      }
    }
    if (quiz.passPercentage! < 0 || quiz.passPercentage! > 100) {
      return "Pass percentage must be between 0 and 100";
    }
    if (quiz.maxAttempts! < 1) {
      return "Maximum attempts must be at least 1";
    }
    if (quiz.timeLimit !== undefined && quiz.timeLimit! < 0) {
      return "Time limit must be at least 0 if provided";
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateQuiz();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    await onSave(quiz);
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `new-q-${Date.now()}`,
      question: "",
      options: ["", ""],
      correctAnswerIndex: 0,
      explanation: ""
    };
    
    setQuiz(prev => ({
      ...prev,
      questions: [...(prev.questions || []), newQuestion]
    }));
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const updatedQuestions = [...(quiz.questions || [])];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuiz(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...(quiz.questions || [])];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuiz(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const addQuestionOption = (questionIndex: number) => {
    const updatedQuestions = [...(quiz.questions || [])];
    updatedQuestions[questionIndex].options.push("");
    setQuiz(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = [...(quiz.questions || [])];
    updatedQuestions.splice(index, 1);
    setQuiz(prev => ({ ...prev, questions: updatedQuestions }));
  };

  return (
    <div className="grid gap-6">
      {error && (
        <div className="mb-6 rounded-2xl bg-red-100 border border-red-200 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quiz Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quiz-title">Quiz Title</Label>
            <Input
              id="quiz-title"
              value={quiz.title || ""}
              onChange={(e) => setQuiz({...quiz, title: e.target.value})}
              placeholder="Enter quiz title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quiz-description">Description</Label>
            <Textarea
              id="quiz-description"
              value={quiz.description || ""}
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
                value={quiz.passPercentage ?? 70}
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
                value={quiz.maxAttempts ?? 1}
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
          {(!quiz.questions || quiz.questions.length === 0) ? (
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
          disabled={isSaving || !quiz.title?.trim()}
        >
          {isSaving ? (mode === "edit" ? "Updating Quiz..." : "Creating Quiz...") : (mode === "edit" ? "Update Quiz" : "Create Quiz")}
        </Button>
      </div>
    </div>
  );
}