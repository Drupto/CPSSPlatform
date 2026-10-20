"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Dumbbell, Timer } from "lucide-react";

export function Courses() {
  const cscsHighlights = [
    "30+ hours of chapter-by-chapter video lectures",
    "150+ practice questions and domain-aligned quizzes",
    "Case study frameworks for athlete & research scenarios",
    "Lifetime access with free updates when the exam changes",
  ];

  const hybridHighlights = [
    "60-75 hours: self-paced video + manual + assignments + case studies",
    "8 real-world case studies and a full capstone coaching project",
    "Assessment-driven system: identify limiters, then program",
    "Not HYROX-only — HYROX is one application inside the system",
  ];

  const frameworkSteps = ["Assess", "Diagnose", "Develop", "Integrate", "Specify", "Perform", "Adapt"];

  return (
    <section className="py-24 bg-slate-50" id="courses">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="w-fit mx-auto mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1">
            Two Flagship Programs
          </Badge>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            Choose Your Path in Fitness Education.
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Whether you&apos;re preparing for the NSCA CSCS exam or building a
            complete hybrid coaching practice, KINÉTIKA gives you a structured,
            evidence-based path from theory to real-world performance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {/* CSCS Prep */}
          <div className="relative flex flex-col p-10 rounded-[2.5rem] bg-white border-2 border-transparent shadow-xl">
            <Badge className="w-fit mb-6 bg-slate-900 text-white border-none px-4 py-1 text-xs font-bold rounded-full">
              BESTSELLER
            </Badge>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-extrabold">CSCS Exam Prep</h3>
            </div>
            <p className="text-slate-500 font-medium mb-6">
              NSCA Certified Strength &amp; Conditioning Specialist
            </p>
            <p className="text-slate-600 leading-relaxed mb-8">
              A complete, exam-focused prep program covering all 26 chapters —
              scientific foundations, exercise technique, program design,
              testing &amp; evaluation, and facility administration — aligned
              with the NSCA Exam Content Outline.
            </p>
            <ul className="space-y-3 mb-10 flex-1">
              {cscsHighlights.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 p-0.5 rounded-full bg-primary/20 flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-slate-700 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full h-14 rounded-2xl text-lg font-bold bg-slate-900 text-white hover:bg-slate-800"
              asChild
            >
              <Link href="/courses">
                Explore CSCS Prep
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
          {/* Hybrid Performance Coach */}
          <div className="relative flex flex-col p-10 rounded-[2.5rem] bg-slate-900 text-white border-2 border-primary shadow-2xl">
            <Badge className="w-fit mb-6 bg-primary text-white border-none px-4 py-1 text-xs font-bold rounded-full">
              NEW · LAUNCH OFFER — FIRST 20 STUDENTS
            </Badge>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <Timer className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-extrabold leading-tight">
                Certified Hybrid Performance Coach
                <span className="block text-primary text-lg font-bold">
                  Level 1
                </span>
              </h3>
            </div>
            <p className="text-slate-400 font-medium mb-6">
              Build the engine. Build the athlete. Integrate the performance.
            </p>
            <p className="text-slate-300 leading-relaxed mb-8">
              A coaching system — not a template library. Learn to assess,
              program, and coach hybrid athletes across strength, running,
              energy systems, nutrition, recovery, and periodization, with
              HYROX as a major application.
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              {hybridHighlights.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 p-0.5 rounded-full bg-primary flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-slate-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-baseline gap-3 mb-8 pb-8 border-b border-white/10">
              <span className="text-4xl font-extrabold">₹4,999</span>
              <span className="text-lg text-slate-400 line-through">₹7,999</span>
              <span className="text-xs uppercase tracking-wider text-primary font-bold">
                Launch price
              </span>
            </div>

            <Button
              className="w-full h-14 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90"
              asChild
            >
              <Link href="/courses">
                Explore Hybrid Coach
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Hybrid framework strip */}
        <div className="mt-16 rounded-3xl bg-white border border-slate-200 shadow-sm p-8 md:p-10">
          <p className="text-center text-sm uppercase tracking-[0.25em] text-primary font-bold mb-6">
            The KINETIKA Hybrid Framework
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-3 mb-8">
            {frameworkSteps.map((step, i) => (
              <span key={step} className="flex items-center">
                <span className="px-4 py-2 rounded-full bg-slate-100 text-slate-800 text-sm font-bold">
                  {step}
                </span>
                {i < frameworkSteps.length - 1 && (
                  <span className="mx-1 text-primary font-bold">→</span>
                )}
              </span>
            ))}
          </div>
          <p className="text-center text-slate-600 max-w-3xl mx-auto leading-relaxed">
            <span className="font-bold text-slate-900">Hybrid Equation:</span>{" "}
            Performance = Engine × Force × Power × Repeatability × Movement
            Efficiency × Recovery × Execution
          </p>
        </div>
      </div>
    </section>
  );
}