"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getEnrollmentsForUser, getCourseById, getCourseResources } from "@/lib/course";
import type { Course, CourseContentItem, Enrollment } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Link as LinkIcon, Video, ExternalLink } from "lucide-react";

export default function ResourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<{course: Course, resources: CourseContentItem[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }
      
      setUser(currentUser);
      
      try {
        // Get user's enrollments
        const userEnrollments = await getEnrollmentsForUser(currentUser.uid);
        setEnrollments(userEnrollments);
        
        // Get course details and resources for each enrollment
        const coursePromises = userEnrollments.map(async (enrollment) => {
          const course = await getCourseById(enrollment.courseId);
          if (course) {
            const resources = await getCourseResources(enrollment.courseId);
            return { course, resources };
          }
          return null;
        });
        
        const courseResults = await Promise.allSettled(coursePromises);
        const validCourses = courseResults
          .filter((result): result is PromiseFulfilledResult<{course: Course, resources: CourseContentItem[]}> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);
        
        setCourses(validCourses);
      } catch (err) {
        console.error("Error loading resources:", err);
        setError("Failed to load resources. Please try again later.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "link":
        return <ExternalLink className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case "document":
        return <Badge variant="secondary">Document</Badge>;
      case "video":
        return <Badge variant="secondary">Video</Badge>;
      case "link":
        return <Badge variant="secondary">Link</Badge>;
      default:
        return <Badge variant="secondary">Resource</Badge>;
    }
  };

  const handleResourceClick = (url?: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading resources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <main className="relative min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-28">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-red-600">{error}</p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900">Study Resources</h1>
          <p className="mt-4 text-slate-600">
            Access study materials and additional resources for your enrolled courses.
          </p>
        </div>

        {courses.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <p className="text-lg text-slate-600">
                You haven't enrolled in any courses yet. 
              </p>
              <Button className="mt-4" onClick={() => router.push("/dashboard/available-courses")}>
                Browse Available Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {courses.map(({ course, resources }) => (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{course.title}</span>
                    <Badge variant="default">Course</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">{course.description}</p>
                  
                  <div className="space-y-4">
                    {course.published ? (
                      resources.length > 0 ? (
                        <div className="grid gap-4">
                          {resources.map((resource) => (
                            <div 
                              key={resource.id} 
                              className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  {getResourceIcon(resource.type)}
                                  <div>
                                    <h3 className="font-medium text-slate-900">{resource.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{resource.body}</p>
                                    {getResourceTypeBadge(resource.type)}
                                  </div>
                                </div>
                                {resource.url && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResourceClick(resource.url);
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    {resource.type === 'document' ? 'Download' : 'Open'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">
                          No resources available for this course yet.
                        </p>
                      )
                    ) : (
                      <p className="text-slate-500 italic">
                        This course is not published yet. Resources will be available when it's published.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
