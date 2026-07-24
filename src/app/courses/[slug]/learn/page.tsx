"use client";


import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getCourseBySlug, getCourseContent, getEnrollment, getCourseProgress, markContentCompleted, markContentIncomplete, getCourseQuizzes, getCourseQuizAttempts, getYouTubeEmbedUrl } from "@/lib/course";
import { isProfileComplete } from "@/lib/profile-check";
import type { CourseContentItem, Course } from "@/lib/types";
import type { StartQuizAttemptResponse, SubmitQuizAttemptResponse } from "@/lib/types/quiz-functions";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

const getQuizTimeLimitSeconds = (quiz: any) => {
  if (quiz.timeLimit === undefined || quiz.timeLimit === null) {
    return null;
  }

  return Math.max(0, Number(quiz.timeLimit)) * 60;
};

const formatQuizTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

export default function CourseLearnPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [content, setContent] = useState<CourseContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]); // Will be Quiz type
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]); // Will be QuizAttempt type
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [currentQuizSessionId, setCurrentQuizSessionId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState<number | null>(null);
  const [quizDeadline, setQuizDeadline] = useState<number | null>(null);
  const [currentQuizAttemptsUsed, setCurrentQuizAttemptsUsed] = useState(0);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isQuizTimerActive, setIsQuizTimerActive] = useState(false);
  const autoSubmittedQuizRef = useRef(false);

  const functionsInstance = getFunctions();
  const startQuizAttemptFn = httpsCallable(functionsInstance, "startQuizAttempt");
  const submitQuizAttemptFn = httpsCallable(functionsInstance, "submitQuizAttempt");

  useEffect(() => {
    if (!slug) return;

    const loadCourse = async () => {
      const courseData = await getCourseBySlug(slug as string);
      setCourse(courseData);
      if (courseData) {
        const contentData = await getCourseContent(courseData.id);
        setContent(contentData);
      }
    };

    loadCourse().finally(() => setLoading(false));
  }, [slug]);

  const loadProgress = useCallback(async (userId: string, courseId: string) => {
    const progress = await getCourseProgress(userId, courseId);
    if (progress) {
      setCompletedIds(progress.completedContentIds || []);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser || !course) {
        setAuthorized(false);
        return;
      }
      setUser(authUser);
      const enrollment = await getEnrollment(authUser.uid, course.id);
      const isAuthorized = enrollment?.status === "approved";
      setAuthorized(isAuthorized);
      setEnrollmentStatus(enrollment ? enrollment.status : null);
      
      // Check if user has completed their profile
      const isComplete = await isProfileComplete(authUser);
      if (!isComplete && !window.location.pathname.startsWith('/dashboard/profile')) {
        router.push('/dashboard/profile');
      }
      
      if (isAuthorized) {
        await loadProgress(authUser.uid, course.id);
      }
    });

    return () => unsubscribe();
  }, [course, loadProgress, router]);

  // Prevent redirect to course page when user is already on learn page and authorized
  useEffect(() => {
    if (!loading && course && !authorized && !window.location.pathname.endsWith('/learn')) {
      // Only redirect if we're not already on the learn page
      router.push(`/courses/${slug}`);
    }
  }, [loading, authorized, course, router, slug]);

  // Load quizzes and quiz attempts when course and user are available
  useEffect(() => {
    const loadQuizzesAndAttempts = async () => {
      if (course && user) {
        try {
          const loadedQuizzes = await getCourseQuizzes(course.id);
          setQuizzes(loadedQuizzes);
          
          const loadedAttempts = await getCourseQuizAttempts(user.uid, course.id);
          setQuizAttempts(loadedAttempts);
        } catch (error) {
          console.error("Error loading quizzes or attempts:", error);
        }
      }
    };
    
    loadQuizzesAndAttempts();
  }, [course, user]);

  const currentItem = content[currentIndex];
  const progressPercent = content.length > 0 ? Math.round((completedIds.length / content.length) * 100) : 0;

  const toggleComplete = async (contentId: string) => {
    if (!user || !course) return;
    
    if (completedIds.includes(contentId)) {
      await markContentIncomplete(user.uid, course.id, contentId);
      setCompletedIds((prev) => prev.filter((id) => id !== contentId));
    } else {
      await markContentCompleted(user.uid, course.id, contentId);
      setCompletedIds((prev) => [...prev, contentId]);
    }
  };

  const goToNext = () => {
    if (currentIndex < content.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Quiz functions
  const startQuiz = async (quiz: any) => {
    if (!user || !course) return;

    const maxAttempts = quiz.maxAttempts ?? 1;
    const attemptsForQuiz = quizAttempts.filter(attempt => attempt.quizId === quiz.id);
    const timeLimitSeconds = getQuizTimeLimitSeconds(quiz);

    if (attemptsForQuiz.length >= maxAttempts) {
      return;
    }

    try {
      const sessionResult = await startQuizAttemptFn({ courseId: course.id, quizId: quiz.id });
      const session = sessionResult.data as StartQuizAttemptResponse;

      setCurrentQuiz(quiz);
      setCurrentQuizSessionId(session.sessionId);
      setShowQuiz(true);
      setQuizAnswers(Array(quiz.questions.length).fill(-1));
      setQuizSubmitted(false);
      setQuizScore(null);
      setQuizPassed(null);
      setQuizTimeRemaining(timeLimitSeconds);
      setQuizDeadline(timeLimitSeconds === null ? null : Date.now() + timeLimitSeconds * 1000);
      setCurrentQuizAttemptsUsed(session.attemptsUsed);
      setIsQuizTimerActive(true);
      autoSubmittedQuizRef.current = false;
    } catch (error) {
      console.error("Error starting quiz attempt:", error);
    }
  };

  const handleQuizAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (quizSubmitted) return;
    
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
  };

  const submitQuiz = async () => {
    if (!user || !currentQuiz || !currentQuizSessionId || quizSubmitted || isSubmittingQuiz) return;
    
    setIsSubmittingQuiz(true);
    
    try {
      const result = await submitQuizAttemptFn({ sessionId: currentQuizSessionId, answers: [...quizAnswers] });
      const response = result.data as SubmitQuizAttemptResponse;

      setQuizScore(response.score);
      setQuizPassed(response.passed);
      setQuizSubmitted(true);
      setCurrentQuizAttemptsUsed(response.attemptsUsed);
      setIsSubmittingQuiz(false);

      setQuizAttempts(prev => [{
        id: response.attemptId,
        userId: user.uid,
        quizId: currentQuiz.id,
        courseId: course!.id,
        answers: [...quizAnswers],
        score: response.score,
        passed: response.passed,
        completedAt: null
      }, ...prev.filter(attempt => attempt.quizId !== currentQuiz.id)]);
    } catch (error) {
      console.error("Error submitting quiz attempt:", error);
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const restartQuiz = async () => {
    if (!currentQuiz || !course || !user) return;

    const attemptsForQuiz = quizAttempts.filter(attempt => attempt.quizId === currentQuiz.id).length;
    const timeLimitSeconds = getQuizTimeLimitSeconds(currentQuiz);

    try {
      const sessionResult = await startQuizAttemptFn({ courseId: course.id, quizId: currentQuiz.id });
      const session = sessionResult.data as StartQuizAttemptResponse;

      setCurrentQuizSessionId(session.sessionId);
      setQuizAnswers(Array(currentQuiz.questions.length).fill(-1));
      setQuizSubmitted(false);
      setQuizScore(null);
      setQuizPassed(null);
      setQuizTimeRemaining(timeLimitSeconds);
      setQuizDeadline(timeLimitSeconds === null ? null : Date.now() + timeLimitSeconds * 1000);
      setCurrentQuizAttemptsUsed(session.attemptsUsed);
      setIsQuizTimerActive(true);
      autoSubmittedQuizRef.current = false;
    } catch (error) {
      console.error("Error restarting quiz attempt:", error);
    }
  };

  const closeQuiz = () => {
    setShowQuiz(false);
    setCurrentQuiz(null);
    setCurrentQuizSessionId(null);
    setQuizTimeRemaining(null);
    setQuizDeadline(null);
    setCurrentQuizAttemptsUsed(0);
    setIsQuizTimerActive(false);
    autoSubmittedQuizRef.current = false;
  };

  useEffect(() => {
    if (!showQuiz || !currentQuiz || quizSubmitted || quizDeadline === null || !isQuizTimerActive) {
      return;
    }

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((quizDeadline - Date.now()) / 1000));
      setQuizTimeRemaining((current) => current === remaining ? current : remaining);

      if (remaining <= 1 && !quizSubmitted && !autoSubmittedQuizRef.current) {
        autoSubmittedQuizRef.current = true;
        submitQuiz().finally(() => {
          setIsQuizTimerActive(false);
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [showQuiz, currentQuiz?.id, quizSubmitted, quizDeadline, isQuizTimerActive, submitQuiz]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Checking your access...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <main className="relative min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-28 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Course not found</h1>
          <p className="mt-4 text-slate-600">The requested course could not be loaded.</p>
          <Button className="mt-8" onClick={() => router.push("/courses")}>Back to Courses</Button>
        </div>
      </main>
    );
  }

  if (content.length === 0) {
    return (
      <main className="relative min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <h1 className="text-4xl font-bold text-slate-900">{course.title}</h1>
            <p className="mt-4 text-slate-600">This course has no content sections yet.</p>
          </div>
        </div>
      </main>
    );
  }

  if (!authorized) {
    const isPending = enrollmentStatus === "pending";
    const isRejected = enrollmentStatus === "rejected";
    return (
      <main className="relative min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-28 text-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
            <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              isRejected
                ? "bg-red-100 border-red-200 text-red-700"
                : "bg-amber-100 border-amber-200 text-amber-700"
            }`}>
              {isRejected
                ? "Your enrollment request for this course was declined by an admin."
                : isPending
                  ? "Your enrollment request is awaiting admin approval. You'll get access once it's approved."
                  : "You don't have access to this course yet. Request access to get started."}
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <Button variant="outline" onClick={() => router.push(`/courses/${course.slug}`)}>
                Back to Course
              </Button>
              <Button onClick={() => router.push("/dashboard/available-courses")}>
                Browse Courses
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

// Quiz Modal Component
const QuizModal = ({ 
  quiz, 
  answers, 
  onAnswerSelect, 
  onSubmit, 
  onRestart,
  onClose, 
  submitted, 
  score, 
  passed,
  canRetake,
  timeRemaining,
  isSubmitting
}: { 
  quiz: any; 
  answers: number[]; 
  onAnswerSelect: (questionIndex: number, answerIndex: number) => void; 
  onSubmit: () => void; 
  onRestart: () => void;
  onClose: () => void; 
  submitted: boolean; 
  score: number | null; 
  passed: boolean | null;
  canRetake: boolean;
  timeRemaining: number | null;
  isSubmitting: boolean;
}) => {
  if (!quiz) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-slate-900">{quiz.title}</h2>
            <button 
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          {timeRemaining !== null ? (
            <div className={`mb-4 rounded-2xl border p-4 text-center ${
              timeRemaining !== null && timeRemaining <= 60
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}>
              <div className="text-sm font-medium">Time remaining</div>
              <div className="text-3xl font-bold">{formatQuizTime(timeRemaining)}</div>
            </div>
          ) : null}
          
          {score !== null && passed !== null ? (
            <div className="mb-6">
              <div className="text-center mb-4">
                <div className={`text-5xl font-bold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
                  {score}%
                </div>
                <div className={`text-lg font-semibold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
                  {passed ? 'Passed!' : 'Failed'}
                </div>
                <p className="text-slate-600 mt-2">
                  {passed 
                    ? 'Congratulations! You passed the quiz.' 
                    : `You need at least ${quiz.passPercentage}% to pass.`}
                </p>
              </div>
              
              <div className="space-y-4">
                {quiz.questions.map((question: any, qIndex: number) => (
                  <div key={qIndex} className="border border-slate-200 rounded-2xl p-4">
                    <h3 className="font-semibold text-slate-900 mb-2">{question.question}</h3>
                    <div className="space-y-2">
                       {question.options.map((option: string, oIndex: number) => {
                        const isCorrect = oIndex === question.correctAnswerIndex;
                        const isSelected = answers[qIndex] === oIndex;
                        const isSkipped = answers[qIndex] === -1;
                        const isWrong = isSelected && !isCorrect;
                        
                        return (
                          <div 
                            key={oIndex} 
                            className={`p-3 rounded-lg border ${
                              isCorrect 
                                ? 'bg-emerald-100 border-emerald-500 text-emerald-800' 
                                : isWrong 
                                  ? 'bg-red-100 border-red-500 text-red-800' 
                                  : isSkipped
                                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                                    : 'bg-slate-100 border-slate-200'
                            } border`}
                          >
                            <div className="flex items-center">
                              <span className="mr-2">
                                {isCorrect ? '✓' : isWrong ? '✗' : isSkipped ? '?' : oIndex + 1}
                              </span>
                              {option}
                              {isSkipped && (
                                <span className="ml-auto text-xs font-medium text-amber-700">Skipped</span>
                              )}
                            </div>
                            {question.explanation && isCorrect && (
                              <p className="text-sm text-slate-600 mt-2 italic">
                                Explanation: {question.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 mt-6">
                {canRetake ? (
                  <Button 
                    onClick={onRestart} 
                    className="flex-1"
                  >
                    Retake Quiz
                  </Button>
                ) : (
                  <Button 
                    onClick={onClose} 
                    className="flex-1"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-slate-600 mb-6">{quiz.description}</p>
              
              <div className="space-y-6">
                {quiz.questions.map((question: any, qIndex: number) => (
                  <div key={qIndex} className="border border-slate-200 rounded-2xl p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">{question.question}</h3>
                    <div className="space-y-2">
                      {question.options.map((option: string, oIndex: number) => (
                        <div 
                          key={oIndex}
                          onClick={() => onAnswerSelect(qIndex, oIndex)}
                          className={`p-3 rounded-lg border cursor-pointer transition ${
                            answers[qIndex] === oIndex
                              ? 'border-primary bg-primary/10'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${
                              answers[qIndex] === oIndex
                                ? 'border-primary bg-primary'
                                : 'border-slate-300'
                            }`}>
                              {answers[qIndex] === oIndex && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                            {option}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={onClose} 
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
                <Button 
                  onClick={onSubmit} 
                  disabled={isSubmitting || answers.some(a => a === -1)}
                  className="flex-1"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Inject the quiz modal into the render
// We'll add it conditionally in the render

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        {/* Progress bar */}
         <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
           <div className="flex items-center justify-between mb-3">
             <h2 className="text-lg font-semibold text-slate-900">{course.title}</h2>
             <span className="text-sm text-slate-500">{completedIds.length} / {content.length} completed</span>
           </div>
           <Progress value={progressPercent} className="h-2" />
           <p className="mt-2 text-sm text-slate-500">{progressPercent}% complete</p>
         </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* Main content area */}
          <div className="space-y-6">
            {/* Section tabs */}
            <div className="flex flex-wrap gap-2">
              {content.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentIndex(idx); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    idx === currentIndex
                      ? "bg-primary text-white"
                      : completedIds.includes(item.id)
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {idx + 1}. {item.title.length > 20 ? item.title.slice(0, 20) + "…" : item.title}
                  {completedIds.includes(item.id) && " ✓"}
                </button>
              ))}
            </div>

            {/* Current content section */}
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-secondary mb-2">
                    Section {currentItem.order} of {content.length}
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">{currentItem.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{currentItem.type.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor={`complete-${currentItem.id}`} className="text-sm text-slate-600 cursor-pointer select-none">
                    Mark complete
                  </label>
                  <Checkbox
                    id={`complete-${currentItem.id}`}
                    checked={completedIds.includes(currentItem.id)}
                    onCheckedChange={() => toggleComplete(currentItem.id)}
                  />
                </div>
              </div>

              {currentItem.type === "text" && (
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">{currentItem.body}</p>
                </div>
              )}

              {currentItem.type === "video" && currentItem.url && (
                <div className="mt-4">
                  <iframe
                    src={getYouTubeEmbedUrl(currentItem.url)}
                    title={currentItem.title}
                    className="h-80 w-full rounded-3xl border border-slate-200"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}

              {currentItem.type === "document" && currentItem.url && (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <p className="text-slate-600 mb-4">This section contains a document for reference.</p>
                  <a
                    href={currentItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90"
                  >
                    Open Document ↗
                  </a>
                </div>
              )}
            </section>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={goToPrev}
                disabled={currentIndex === 0}
              >
                ← Previous Section
              </Button>
              <span className="text-sm text-slate-500">
                {currentIndex + 1} of {content.length}
              </span>
              <Button
                onClick={goToNext}
                disabled={currentIndex === content.length - 1}
              >
                Next Section →
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Course Outline</h3>
              <ul className="space-y-2">
                {content.map((item, idx) => (
                  <li key={item.id}>
                    <button
                      onClick={() => { setCurrentIndex(idx); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={`w-full text-left text-sm py-1.5 px-3 rounded-lg transition ${
                        idx === currentIndex
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          completedIds.includes(item.id)
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}>
                          {completedIds.includes(item.id) ? "✓" : idx + 1}
                        </span>
                        {item.title}
                      </span>
                    </button>
                  </li>
                ))}
                
                {/* Quiz buttons */}
                {quizzes.map((quiz, quizIdx) => {
                  const quizAttemptsForQuiz = quizAttempts.filter(attempt => attempt.quizId === quiz.id);
                  const quizAttempt = quizAttemptsForQuiz[0];
                  const passed = quizAttempt ? quizAttempt.passed : null;
                  const maxAttempts = quiz.maxAttempts ?? 1;
                  const canStartQuiz = quizAttemptsForQuiz.length < maxAttempts;
                  
                  return (
                    <li key={`quiz-${quiz.id}`}>
                      <button
                        onClick={() => startQuiz(quiz)}
                        disabled={!canStartQuiz}
                        className={`w-full text-left text-sm py-1.5 px-3 rounded-lg transition ${
                          !canStartQuiz
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : passed 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            passed 
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}>
                            {passed ? "✓" : "Q"}
                          </span>
                          {quiz.title}
                          {passed && (
                            <span className="ml-auto text-xs">
                              {quizAttempt?.score}% passed
                            </span>
                          )}
                          {!passed && !canStartQuiz && (
                            <span className="ml-auto text-xs">
                              Attempts used
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Course Info</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>Status: {course.published ? "Published" : "Draft"}</p>
                <p>Sections: {content.length}</p>
                <p>Completed: {completedIds.length}</p>
              </div>
              <Button className="w-full mt-4" variant="outline" onClick={() => router.push("/courses")}>
                Back to Catalog
              </Button>
            </div>
          </aside>
        </div>
      </div>
      
      {/* Quiz Modal */}
      {showQuiz && (
        <QuizModal 
          quiz={currentQuiz}
          answers={quizAnswers}
          onAnswerSelect={handleQuizAnswerSelect}
          onSubmit={submitQuiz}
          onRestart={restartQuiz}
          onClose={closeQuiz}
          submitted={quizSubmitted}
          score={quizScore}
          passed={quizPassed}
          canRetake={currentQuiz ? currentQuizAttemptsUsed < (currentQuiz.maxAttempts ?? 1) : false}
          timeRemaining={quizTimeRemaining}
          isSubmitting={isSubmittingQuiz}
        />
      )}
    </main>
  );
}
