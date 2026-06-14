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
  getAllQuizAttemptsForCourse,
  getQuizById,
  getCourseQuizzes
} from "@/lib/course";
import type { Course, QuizAttempt, Quiz } from "@/lib/types";
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Download, 
  Eye, 
  Filter,
  Users,
  BarChart3,
  Clock,
  Trophy,
  XCircle,
  CheckCircle
} from "lucide-react";

interface UserQuizAttempt extends QuizAttempt {
  userName?: string;
  userEmail?: string;
  quizTitle?: string;
}

export default function CourseQuizAnalyticsPage() {
  const { id: courseId } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [attempts, setAttempts] = useState<UserQuizAttempt[]>([]);
  const [filteredAttempts, setFilteredAttempts] = useState<UserQuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [users, setUsers] = useState<{id: string, name: string, email: string}[]>([]);

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
        
        // Get all quizzes for this course
        const courseQuizzes = await getCourseQuizzes(courseId as string);
        setQuizzes(courseQuizzes);
        
        // Get all quiz attempts for this course (for admin analytics - all students)
        const allAttempts = await getAllQuizAttemptsForCourse(courseId as string);
        
        // Fetch user details for each attempt
        const attemptsWithUserDetails: UserQuizAttempt[] = await Promise.all(
          allAttempts.map(async (attempt) => {
            const user = await getUserProfile(attempt.userId);
            const quiz = await getQuizById(attempt.quizId, courseId as string);
            
            return {
              ...attempt,
              userName: user?.displayName || "Unknown User",
              userEmail: user?.email || "No Email",
              quizTitle: quiz?.title || "Unknown Quiz"
            };
          })
        );
        
        setAttempts(attemptsWithUserDetails);
        setFilteredAttempts(attemptsWithUserDetails);
        
        // Extract unique users from attempts
        const uniqueUsers = Array.from(
          new Map(attemptsWithUserDetails.map(a => [a.userId, { id: a.userId, name: a.userName || "Unknown", email: a.userEmail || "" }]))
        ).map(([_, user]) => user);
        setUsers(uniqueUsers);
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading course data:", err);
        setError("Failed to load course data");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [courseId, router]);

  // Apply filters
  useEffect(() => {
    let result = attempts;
    
    if (selectedQuiz !== "all") {
      result = result.filter(attempt => attempt.quizId === selectedQuiz);
    }
    
    if (selectedUser !== "all") {
      result = result.filter(attempt => attempt.userId === selectedUser);
    }
    
    setFilteredAttempts(result);
  }, [selectedQuiz, selectedUser, attempts]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading course analytics...</p>
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
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
            className="mb-4"
          >
            ← Back to Course
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Quiz Analytics</h1>
          <p className="text-slate-600">Review student performance and quiz results for {course?.title}</p>
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
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Quiz</label>
                <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a quiz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quizzes</SelectItem>
                    {quizzes.map(quiz => (
                      <SelectItem key={quiz.id} value={quiz.id}>{quiz.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Filter by User</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedQuiz("all");
                    setSelectedUser("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Quiz Attempts</span>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No quiz attempts found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div className="font-medium">{attempt.userName}</div>
                        <div className="text-sm text-slate-500">{attempt.userEmail}</div>
                      </TableCell>
                      <TableCell>{attempt.quizTitle}</TableCell>
                      <TableCell>
                        <Badge className={getScoreColor(attempt.score)}>
                          {attempt.score}%
                        </Badge>
                      </TableCell>
                      <TableCell>{getPassStatus(attempt.passed)}</TableCell>
                      <TableCell>{formatDate(attempt.completedAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => router.push(`/admin/courses/${courseId}/quizzes/${attempt.quizId}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}