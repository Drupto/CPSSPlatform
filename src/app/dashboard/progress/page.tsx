"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getEnrollmentsForUser, getCourseById, getCourseProgress, getCourseContent } from "@/lib/course";
import { isProfileComplete } from "@/lib/profile-check";
import type { Enrollment, Course, CourseProgress, CourseContentItem } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProgressPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Map<string, Course>>(new Map());
  const [progress, setProgress] = useState<Map<string, CourseProgress>>(new Map());
  const [content, setContent] = useState<Map<string, CourseContentItem[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        router.push("/auth");
        return;
      }

      // Check if user has completed their profile
      const isComplete = await isProfileComplete(user);
      if (!isComplete && !window.location.pathname.startsWith('/dashboard/profile')) {
        router.push('/dashboard/profile');
        return;
      }

      const userEnrollments = await getEnrollmentsForUser(user.uid);
      setEnrollments(userEnrollments);

      const courseMap = new Map<string, Course>();
      const progressMap = new Map<string, CourseProgress>();
      const contentMap = new Map<string, CourseContentItem[]>();
      
      // Fetch course details and progress for each enrollment
      for (const enrollment of userEnrollments) {
        const course = await getCourseById(enrollment.courseId);
        if (course) {
          courseMap.set(course.id, course);
          
          // Get progress for this course
          const courseProgress = await getCourseProgress(user.uid, course.id);
          if (courseProgress) {
            progressMap.set(course.id, courseProgress);
          }
          
          // Get course content
          const courseContent = await getCourseContent(course.id);
          contentMap.set(course.id, courseContent);
        }
      }
      
      setCourses(courseMap);
      setProgress(progressMap);
      setContent(contentMap);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const calculateProgressPercentage = (courseId: string): number => {
    const courseProgress = progress.get(courseId);
    const courseContent = content.get(courseId) || [];
    
    if (courseContent.length === 0) return 0;
    
    const completedCount = courseProgress?.completedContentIds?.length || 0;
    return Math.round((completedCount / courseContent.length) * 100);
  };

  const getCompletedCount = (courseId: string): number => {
    const courseProgress = progress.get(courseId);
    return courseProgress?.completedContentIds?.length || 0;
  };

  const getTotalCount = (courseId: string): number => {
    const courseContent = content.get(courseId) || [];
    return courseContent.length;
  };

  if (loading) {
    return (
      <main className="relative min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-600">
            Loading your progress...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Learning Progress</h1>
            <p className="mt-2 text-slate-600">Track your learning journey and achievements</p>
          </div>

          {enrollments.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">No courses enrolled</h2>
              <p className="text-slate-600 mb-6">You haven't enrolled in any courses yet. Start your learning journey by enrolling in a course.</p>
              <Button onClick={() => router.push("/dashboard/available-courses")}>Browse Courses</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {enrollments.map((enrollment) => {
                const course = courses.get(enrollment.courseId);
                if (!course) return null;

                const progressPercentage = calculateProgressPercentage(course.id);
                const completedCount = getCompletedCount(course.id);
                const totalCount = getTotalCount(course.id);

                 return (
                   <Card key={enrollment.id} className="border-slate-200">
                     <CardHeader>
                       <CardTitle className="flex items-center justify-between">
                         <span>{course.title}</span>
                         <span className="text-sm font-normal text-slate-500">
                           {progressPercentage}% complete
                         </span>
                       </CardTitle>
                       <p className="text-xs text-slate-500 mt-1">ID: {course.id}</p>
                     </CardHeader>
                     <CardContent>
                       <div className="mb-4">
                         <div className="flex justify-between text-sm text-slate-600 mb-1">
                           <span>Progress</span>
                           <span>{completedCount}/{totalCount} sections completed</span>
                         </div>
                         <Progress value={progressPercentage} className="h-2" />
                       </div>
                       
                       <div className="flex gap-3">
                         <Button 
                           variant="outline" 
                           onClick={() => router.push(`/courses/${course.slug}/learn`)}
                         >
                           Continue Learning
                         </Button>
                         <Button 
                           variant="outline" 
                           onClick={() => router.push(`/courses/${course.slug}`)}
                         >
                           View Course Details
                         </Button>
                       </div>
                     </CardContent>
                   </Card>
                 );
              })}
            </div>
          )}

          <div className="pt-8 border-t border-slate-200">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    </main>
  );
}