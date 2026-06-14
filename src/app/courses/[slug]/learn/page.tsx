"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCourseBySlug, getCourseContent, getEnrollment, getCourseProgress, markContentCompleted, markContentIncomplete, getCourseQuizzes, createQuizAttempt, getCourseQuizAttempts, getYouTubeEmbedUrl } from "@/lib/course";
import { isProfileComplete } from "@/lib/profile-check";
import type { CourseContentItem, Course } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

export default function CourseLearnPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [content, setContent] = useState<CourseContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]); // Will be Quiz type
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]); // Will be QuizAttempt type
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);

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
      const isAuthorized = Boolean(enrollment);
      setAuthorized(isAuthorized);
      
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
  const startQuiz = (quiz: any) => {
    setCurrentQuiz(quiz);
    setShowQuiz(true);
    setQuizAnswers(Array(quiz.questions.length).fill(-1)); // Initialize with -1 (unanswered)
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizPassed(null);
  };

  const handleQuizAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (quizSubmitted) return;
    
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
  };

  const submitQuiz = async () => {
    if (!user || !currentQuiz || quizSubmitted) return;
    
    // Calculate score
    let correctCount = 0;
    currentQuiz.questions.forEach((question: any, index: number) => {
      if (quizAnswers[index] === question.correctAnswerIndex) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / currentQuiz.questions.length) * 100);
    const passed = score >= currentQuiz.passPercentage;
    
    setQuizScore(score);
    setQuizPassed(passed);
    setQuizSubmitted(true);
    
    // Save attempt to database
    try {
      await createQuizAttempt({
        userId: user.uid,
        quizId: currentQuiz.id,
        courseId: course!.id,
        answers: quizAnswers,
        score,
        passed
      });
    } catch (error) {
      console.error("Error saving quiz attempt:", error);
    }
  };

  const restartQuiz = () => {
    setQuizAnswers(Array(currentQuiz.questions.length).fill(-1));
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizPassed(null);
  };

  const closeQuiz = () => {
    setShowQuiz(false);
    setCurrentQuiz(null);
  };

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

// Quiz Modal Component
const QuizModal = ({ 
  quiz, 
  answers, 
  onAnswerSelect, 
  onSubmit, 
  onClose, 
  submitted, 
  score, 
  passed 
}: { 
  quiz: any; 
  answers: number[]; 
  onAnswerSelect: (questionIndex: number, answerIndex: number) => void; 
  onSubmit: () => void; 
  onClose: () => void; 
  submitted: boolean; 
  score: number | null; 
  passed: boolean | null; 
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
                        const isWrong = isSelected && !isCorrect;
                        
                        return (
                          <div 
                            key={oIndex} 
                            className={`p-3 rounded-lg ${
                              isCorrect 
                                ? 'bg-emerald-100 border-emerald-500 text-emerald-800' 
                                : isWrong 
                                  ? 'bg-red-100 border-red-500 text-red-800' 
                                  : 'bg-slate-100 border-slate-200'
                            } border`}
                          >
                            <div className="flex items-center">
                              <span className="mr-2">
                                {isCorrect ? '✓' : isWrong ? '✗' : oIndex + 1}
                              </span>
                              {option}
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
                <Button 
                  onClick={onSubmit} 
                  className="flex-1"
                >
                  Retake Quiz
                </Button>
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
                  disabled={answers.some(a => a === -1)}
                  className="flex-1"
                >
                  Submit
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
                  const quizAttempt = quizAttempts.find(attempt => attempt.quizId === quiz.id);
                  const passed = quizAttempt ? quizAttempt.passed : null;
                  
                  return (
                    <li key={`quiz-${quiz.id}`}>
                      <button
                        onClick={() => startQuiz(quiz)}
                        className={`w-full text-left text-sm py-1.5 px-3 rounded-lg transition ${
                          passed 
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
          onClose={closeQuiz}
          submitted={quizSubmitted}
          score={quizScore}
          passed={quizPassed}
        />
      )}
    </main>
  );
}
