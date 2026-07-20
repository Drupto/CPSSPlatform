"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getCourseById,
  getUserProfile,
  isAdminProfile,
  getEnrollmentsForCourse,
  getCourseContent,
  getAllProgressForCourse,
  getAllQuizAttemptsForCourse,
} from "@/lib/course";
import type { Course, CourseProgress, CourseContentItem, Enrollment } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { BackToAdminButton } from "@/components/admin/BackToAdminButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  Download,
} from "lucide-react";

interface StudentRow {
  userId: string;
  name: string;
  email: string;
  enrolledAt: import("firebase/firestore").Timestamp | null;
  completedContentIds: string[];
  totalContent: number;
  quizAttempts: number;
}

function formatDate(timestamp: any): string {
  if (!timestamp) return "N/A";
  return new Date(timestamp.toDate()).toLocaleDateString();
}

export default function CourseAnalyticsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [totalContent, setTotalContent] = useState(0);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        const courseData = await getCourseById(courseId);
        if (!courseData) {
          setError("Course not found");
          setLoading(false);
          return;
        }
        setCourse(courseData);

        const [contentItems, enrollments, attempts, progressDocs] =
          await Promise.all([
            getCourseContent(courseId),
            getEnrollmentsForCourse(courseId),
            getAllQuizAttemptsForCourse(courseId),
            getAllProgressForCourse(courseId),
          ]);
        setTotalContent(contentItems.length);

        const progressByUser = new Map<string, CourseProgress>();
        progressDocs.forEach((p) => progressByUser.set(p.userId, p));

        const attemptsByUser = new Map<string, number>();
        attempts.forEach((a) => {
          attemptsByUser.set(a.userId, (attemptsByUser.get(a.userId) || 0) + 1);
        });

        const rows: StudentRow[] = await Promise.all(
          enrollments.map(async (enrollment) => {
            const user = await getUserProfile(enrollment.userId);
            const progress = progressByUser.get(enrollment.userId);
            return {
              userId: enrollment.userId,
              name: user?.displayName || "Unknown User",
              email: user?.email || "No Email",
              enrolledAt: enrollment.enrolledAt ?? null,
              completedContentIds: progress?.completedContentIds || [],
              totalContent: contentItems.length,
              quizAttempts: attemptsByUser.get(enrollment.userId) || 0,
            };
          })
        );
        setStudents(rows);
        setLoading(false);
      } catch (err) {
        console.error("Error loading course analytics:", err);
        setError("Failed to load course analytics");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [courseId, router]);

  const totalEnrolled = students.length;
  const completedCount = students.filter(
    (s) => s.totalContent > 0 && s.completedContentIds.length >= s.totalContent
  ).length;
  const inProgressCount = students.filter(
    (s) => s.completedContentIds.length > 0 && s.completedContentIds.length < s.totalContent
  ).length;
  const avgCompletion =
    totalEnrolled > 0 && totalContent > 0
      ? Math.round(
          students.reduce(
            (sum, s) => sum + (s.completedContentIds.length / s.totalContent) * 100,
            0
          ) / totalEnrolled
        )
      : 0;

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-100 text-green-800";
    if (percentage >= 30) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const exportToCSV = () => {
    if (students.length === 0) return;
    const headers = [
      "Student Name",
      "Email",
      "Enrolled At",
      "Content Completed",
      "Total Content",
      "Completion %",
      "Quiz Attempts",
    ];
    const rows = students.map((s) => {
      const completion =
        s.totalContent > 0
          ? Math.round((s.completedContentIds.length / s.totalContent) * 100)
          : 0;
      return [
        s.name,
        s.email,
        s.enrolledAt ? new Date(s.enrolledAt.toDate()).toLocaleString() : "N/A",
        s.completedContentIds.length,
        s.totalContent,
        `${completion}%`,
        s.quizAttempts,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${course?.title || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
          <BackToAdminButton />
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
            className="mb-4"
          >
            ← Back to Course
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Course Analytics</h1>
          <p className="text-slate-600">Student enrollment and progress overview for {course?.title}</p>
        </div>

        <div className="grid gap-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
                <Users className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEnrolled}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <GraduationCap className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inProgressCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                <BarChart3 className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgCompletion}%</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Student Progress</span>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Enrolled At</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Quiz Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No enrolled students yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => {
                    const completion =
                      student.totalContent > 0
                        ? Math.round(
                            (student.completedContentIds.length / student.totalContent) * 100
                          )
                        : 0;
                    return (
                      <TableRow key={student.userId}>
                        <TableCell>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-slate-500">{student.email}</div>
                        </TableCell>
                        <TableCell>{formatDate(student.enrolledAt)}</TableCell>
                        <TableCell>
                          {student.completedContentIds.length} / {student.totalContent} items
                        </TableCell>
                        <TableCell>
                          <Badge className={getCompletionColor(completion)}>
                            {completion}%
                          </Badge>
                        </TableCell>
                        <TableCell>{student.quizAttempts}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
