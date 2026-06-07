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
  getCourseQuizAttempts,
  getQuizById,
  getUserProfile as getUserProfileFunc,
  getQuizById as getQuizByIdFunc
} from "@/lib/course";
import type { Course, QuizAttempt, Quiz, QuizQuestion } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Download, 
  Eye,
  Users,
  BarChart3,
  Clock,
  Trophy,
  XCircle,
  CheckCircle,
  ChevronLeft,
  FileText
} from "lucide-react";

interface DetailedQuizAttempt extends QuizAttempt {
  userName?: string;
  userEmail?: string;
  quizTitle?: string;
  quiz?: Quiz;
  questions?: QuizQuestion[];
}

export default function QuizDetailedResultsPage() {
  const { id: courseId, quizId } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<DetailedQuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }

      const profile = await getUserProfileFunc(currentUser.uid);
      if (!isAdminProfile(profile)) {
        router.push("/");
        return;
      }

      if (!courseId || !quizId) {
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
        
        // Get the quiz details
        const quizData = await getQuizByIdFunc(quizId as string);
        if (!quizData) {
          setError("Quiz not found");
          setLoading(false);
          return;
        }
        
        setQuiz(quizData);
        
        // Get all quiz attempts for this quiz
        const allAttempts = await getCourseQuizAttempts(currentUser.uid, courseId as string);
        
        // Filter attempts for this specific quiz
        const quizAttempts = allAttempts.filter(attempt => attempt.quizId === quizId);
        
        // Fetch user details for each attempt
        const attemptsWithUserDetails: DetailedQuizAttempt[] = await Promise.all(
          quizAttempts.map(async (attempt) => {
            const user = await getUserProfileFunc(attempt.userId);
            
            return {
              ...attempt,
              userName: user?.displayName || "Unknown User",
              userEmail: user?.email || "No Email",
              quizTitle: quizData.title,
              quiz: quizData
            };
          })
        );
        
        setAttempts(attemptsWithUserDetails);
        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [courseId, quizId, router]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.toDate()).toLocaleDateString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getPassStatus = (passed: boolean) => {
    return passed ? (
      <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" /> Passed
      </Badge>
    ) : (
      <Badge className="flex items-center gap-1 bg-red-100 text-red-800">
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    );
  };

  const getAnswerStatus = (userAnswer: number, correctAnswer: number) => {
    if (userAnswer === correctAnswer) {
      return <span className="text-green-600">✓ Correct</span>;
    }
    return <span className="text-red-600">✗ Incorrect</span>;
  };

  const renderQuestionAnswers = (attempt: DetailedQuizAttempt) => {
    if (!attempt.quiz || !attempt.quiz.questions || !attempt.answers) return null;
    
    return (
      <div className="space-y-4">
        {attempt.quiz.questions.map((question, qIndex) => {
          const userAnswer = attempt.answers[qIndex];
          const correctAnswer = question.correctAnswerIndex;
          
          return (
            <div key={qIndex} className="border rounded-lg p-4">
              <div className="font-medium mb-2">
                {qIndex + 1}. {question.question}
              </div>
              <div className="space-y-2">
                {question.options.map((option, oIndex) => {
                  const isCorrect = oIndex === correctAnswer;
                  const isSelected = userAnswer === oIndex;
                  
                  let bgColor = "bg-white";
                  if (isSelected && isCorrect) {
                    bgColor = "bg-green-100 border-green-500";
                  } else if (isSelected && !isCorrect) {
                    bgColor = "bg-red-100 border-red-500";
                  } else if (isCorrect) {
                    bgColor = "bg-green-50 border-green-300";
                  }
                  
                  return (
                    <div 
                      key={oIndex} 
                      className={`p-2 rounded border ${bgColor} ${
                        isSelected ? "border-2" : "border"
                      }`}
                    >
                      <div className="flex items-start">
                        <span className="font-medium mr-2">{String.fromCharCode(65 + oIndex)}.</span>
                        <span>{option}</span>
                        {isCorrect && (
                          <span className="ml-auto text-green-600">✓ Correct</span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="ml-auto text-red-600">✗ Selected</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {question.explanation && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="font-medium">Explanation:</span> {question.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading quiz results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-red-100 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-700">{error}</p>
          <Button className="mt-4" onClick={() => router.push(`/admin/courses/${courseId}/quizzes`)}>
            Back to Analytics
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
            onClick={() => router.push(`/admin/courses/${courseId}/quizzes`)}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Analytics
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Quiz Results: {quiz?.title}</h1>
          <p className="text-slate-600">Detailed results for {course?.title}</p>
        </div>

        <div className="grid gap-6 mb-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                <Users className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attempts.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {attempts.length > 0 
                    ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length) 
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                <Trophy className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {attempts.length > 0 
                    ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) 
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
                <Clock className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">N/A</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Results Detail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Filter by User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {attempts.map(attempt => (
                        <SelectItem key={attempt.userId} value={attempt.userId}>{attempt.userName} ({attempt.userEmail})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedUser("all")}
                  >
                    Clear Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Quiz Attempts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No quiz attempts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  attempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div className="font-medium">{attempt.userName}</div>
                        <div className="text-sm text-slate-500">{attempt.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getScoreColor(attempt.score)}>
                          {attempt.score}%
                        </Badge>
                      </TableCell>
                      <TableCell>{getPassStatus(attempt.passed)}</TableCell>
                      <TableCell>{formatDate(attempt.completedAt)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // In a real implementation, this would show the detailed view
                            alert(`Showing detailed results for ${attempt.userName}`);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detailed Results Section */}
        {attempts.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {attempts.slice(0, 1).map((attempt) => (
                  <div key={attempt.id} className="border rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{attempt.userName}</h3>
                        <p className="text-slate-600">{attempt.userEmail}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          <Badge className={getScoreColor(attempt.score)}>
                            {attempt.score}%
                          </Badge>
                        </div>
                        <div className="mt-1">
                          {getPassStatus(attempt.passed)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Question Answers</h4>
                      {renderQuestionAnswers(attempt)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}