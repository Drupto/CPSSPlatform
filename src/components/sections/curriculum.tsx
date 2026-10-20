
"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Dumbbell } from "lucide-react";

type Track = "cscs" | "hybrid";

interface SyllabusModule {
  id: string;
  title: string;
  chapters: string;
  topics: string[];
  practical?: string;
}

export function Curriculum() {
  const [track, setTrack] = useState<Track>("cscs");

  const cscsModules: SyllabusModule[] = [
    {
      id: "module-1",
      title: "Scientific Foundations",
      chapters: "Chapters 1-12",
      topics: [
        "Ch. 1: Structure and Function of Body Systems - Musculoskeletal, Neuromuscular, Cardiovascular, Respiratory Systems, and Exercise Responses",
        "Ch. 2: Biomechanics of Resistance Exercise - Skeletal Musculature, Anatomical Planes, Strength, Power, and Joint Biomechanics",
        "Ch. 3: Bioenergetics of Exercise and Training - Biological Energy Systems, Substrate Depletion, and Metabolic Specificity",
        "Ch. 4: Endocrine Responses to Resistance Exercise - Hormonal Functions, Anabolic Hormones, IGF, Cortisol, and Catecholamines",
        "Ch. 5: Adaptations to Anaerobic Training - Neural, Muscular, Connective Tissue, and Cardiovascular Adaptations",
        "Ch. 6: Adaptations to Aerobic Training - Chronic Adaptations and External Factors Influencing Responses",
        "Ch. 7: Age-Related Differences - Youth and Older Adult Considerations",
        "Ch. 8: Sex-Related Differences - Female-Specific Training Responses and Adaptations",
        "Ch. 9: Psychological Foundations of Performance - Sport Psychology, Arousal, Motivation, and Mental Health",
        "Ch. 10: Basic Nutritional Factors - Macronutrients, Vitamins, Minerals, and Hydration",
        "Ch. 11: Nutrition Strategies for Performance - Pre-, During, and Post-Competition Nutrition",
        "Ch. 12: Performance-Enhancing Substances - Types, Hormones, and Dietary Supplements"
      ]
    },
    {
      id: "module-2",
      title: "Exercise Technique",
      chapters: "Chapters 15-17",
      topics: [
        "Ch. 15: Performance Preparation, Mobility, and Flexibility - Warm-Up Protocols and Stretching Types",
        "Ch. 16: Exercise Technique for Free Weight and Machine Training - Fundamentals, Spotting, and Free Weight Exercises",
        "Ch. 17: Exercise Technique for Alternative Modes - Bodyweight Training, Core Stability, Variable Resistance, and Unilateral Training"
      ]
    },
    {
      id: "module-3",
      title: "Program Design",
      chapters: "Chapters 18-22",
      topics: [
        "Ch. 18: Program Design for Resistance Training - Needs Analysis, Exercise Selection, Frequency, Load, Volume, and Rest Periods",
        "Ch. 19: Plyometric Training - Mechanics, Physiology, Program Design, and Safety Considerations",
        "Ch. 20: Speed and Agility Training - Mechanics, Running Speed Development, and Agility Strategies",
        "Ch. 21: Aerobic Endurance and Metabolic Training - Program Design Types and Training Season Application",
        "Ch. 22: Periodization - Central Concepts, Planning, Models, Phases, and Annual Training Plans"
      ]
    },
    {
      id: "module-4",
      title: "Organization & Administration",
      chapters: "Chapters 23-26",
      topics: [
        "Ch. 23: Rehabilitation, Reconditioning, and Medical Issues - Tissue Healing, Program Design, and Medical Conditions",
        "Ch. 24: Overreaching, Overtraining, and Recovery - General Adaptation Syndrome, Assessment, and Recovery Strategies",
        "Ch. 25: Facility Design, Layout, and Organization - General Design Aspects, Equipment Arrangement, and Maintenance",
        "Ch. 26: Facility Policies, Procedures, and Legal Issues - Mission Statements, Program Objectives, Legal Issues, and Emergency Planning"
      ]
    },
    {
      id: "module-5",
      title: "Testing & Evaluation",
      chapters: "Chapters 13-14",
      topics: [
        "Ch. 13: Principles of Test Selection and Administration - Testing Terminology, Test Quality Evaluation, and Selection Criteria",
        "Ch. 14: Administration, Scoring, and Interpretation of Selected Tests - Athletic Performance Parameters, Protocols, and Statistical Evaluation"
      ]
    }
  ];

  const hybridModules: SyllabusModule[] = [
    {
      id: "hybrid-1",
      title: "The Hybrid Coaching Mindset",
      chapters: "Chapter 1",
      practical: "Practical: mission & principles",
      topics: [
        "From trainer to performance coach — defining hybrid athlete, hybrid performance, coaching vs training",
        "Athlete-centered coaching, ethics, individualization, and the KINÉTIKA coaching philosophy",
        "Guided exercise: create your own coaching mission and principles",
      ],
    },
    {
      id: "hybrid-2",
      title: "Human Performance Foundations",
      chapters: "Chapter 2",
      practical: "Practical: movement screening",
      topics: [
        "Functional anatomy and the 8 movement patterns: squat, hinge, lunge, push, pull, carry, rotate, brace",
        "Biomechanics essentials: force, torque, ground reaction force, stability, rate of force development",
        "Learn to read movement — \"What am I seeing?\", not just which muscles work",
      ],
    },
    {
      id: "hybrid-3",
      title: "The Hybrid Performance Engine",
      chapters: "Chapter 3",
      practical: "Practical: conditioning methods",
      topics: [
        "Energy systems: ATP-PC, glycolytic, oxidative — and how they interact during effort",
        "Aerobic performance: VO2max, lactate threshold, ventilatory threshold, running economy, HR/RPE",
        "Anaerobic capacity and repeatability — all systems work together",
        "How to select the correct conditioning method for the adaptation you want",
      ],
    },
    {
      id: "hybrid-4",
      title: "Strength & Power for Hybrid Athletes",
      chapters: "Chapter 4",
      practical: "How strong is enough?",
      topics: [
        "Max strength, relative strength, strength endurance, power, RFD, jumping and throwing",
        "Exercise selection for hybrid needs and the programming variables that matter",
        "Goal: enough strength for performance — not becoming a powerlifter",
      ],
    },
    {
      id: "hybrid-5",
      title: "Running Performance",
      chapters: "Chapter 5",
      practical: "Compromised running",
      topics: [
        "Mechanics, posture, cadence, stride — running is not just cardio",
        "Development methods: easy, tempo, threshold, intervals, hills + pace zones and race pacing",
        "Critical hybrid concept: compromised running — performing after functional fatigue",
      ],
    },
    {
      id: "hybrid-6",
      title: "Hybrid Training Systems",
      chapters: "Chapter 6",
      practical: "3-6 day program system",
      topics: [
        "Concurrent training, the interference effect, and training sequence",
        "Hard/easy distribution, the high-low model, volume and intensity management",
        "Build 3-6 day programs from a system — not templates",
      ],
    },
    {
      id: "hybrid-7",
      title: "HYROX Performance Application",
      chapters: "Chapter 7",
      practical: "ENGINE × FORCE × REPEAT × EXECUTION",
      topics: [
        "Official format: 8 × 1 km runs + 8 functional stations — race demands, strategy, Roxzone",
        "Station-by-station breakdown: SkiErg, Sled Push/Pull, Burpee Broad Jump, Row, Farmer Carry, Lunges, Wall Balls",
        "HYROX as a performance laboratory inside the wider hybrid system",
      ],
    },
    {
      id: "hybrid-8",
      title: "Nutrition, Hydration & Recovery",
      chapters: "Chapter 8",
      practical: "Fuel · hydrate · recover",
      topics: [
        "Energy balance, macros, meal timing, pre/during/post-training nutrition",
        "Hydration, electrolytes, and body-composition trade-offs",
        "Sleep, fatigue monitoring, deloads — performance guidance, not clinical treatment",
      ],
    },
    {
      id: "hybrid-9",
      title: "Assessment, Program Design & Periodization",
      chapters: "Chapter 9",
      practical: "Foundation → Peak → Taper",
      topics: [
        "Assessment system for movement, strength, running and conditioning + test selection decision tree",
        "Build a complete athlete profile from testing data",
        "Periodization: Foundation → Development → Integration → Specific Prep → Peak → Taper",
      ],
    },
    {
      id: "hybrid-10",
      title: "Coaching Practicum & Case Studies",
      chapters: "Chapter 10",
      practical: "8 case studies + capstone",
      topics: [
        "8 case studies: beginner, strong-but-poor runner, good runner but weak, intermediate/advanced HYROX, female athlete, master athlete, return-to-train",
        "Capstone final project: Athlete Profile → Goal Analysis → Assessment → Limiter ID → Exercise Selection → Zones → Weekly Plan → 4-8 week progression → Monitoring → Reassessment",
        "Certification is not MCQ-only — you graduate with real evidence of coaching skill",
      ],
    },
  ];

  const trackFacts: Record<Track, string[]> = {
    cscs: [
      "26 chapters · 5 modules",
      "30+ hours of video",
      "150+ practice questions",
      "Aligned to the NSCA Exam Content Outline",
      "Lifetime access",
    ],
    hybrid: [
      "10 chapters · 60-75 hours",
      "Self-paced video + manual",
      "8 case studies + capstone project",
      "ASSESS → ADAPT framework",
      "HYROX as a major application",
    ],
  };

  return (
    <section className="py-24 bg-white dark:bg-zinc-950" id="curriculum">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold mb-4">Choose Your Curriculum Track.</h2>
          <p className="text-slate-600 max-w-2xl mx-auto dark:text-zinc-400">
            Switch between program tracks — every chapter of both courses is listed below, syllabus-style.
          </p>
        </div>

        {/* Track switcher */}
        <div className="flex justify-center mb-8">
          <div
            role="tablist"
            aria-label="Curriculum track"
            className="inline-flex flex-wrap justify-center gap-2 p-2 rounded-full bg-slate-100 dark:bg-zinc-800"
          >
            {(
              [
                { id: "cscs", label: "CSCS Exam Prep", meta: "26 chapters", Icon: BookOpen },
                { id: "hybrid", label: "Hybrid Performance Coach L1", meta: "10 chapters", Icon: Dumbbell },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={track === t.id}
                onClick={() => setTrack(t.id)}
                className={`px-5 sm:px-6 py-3 rounded-full text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  track === t.id
                    ? "bg-slate-900 text-white shadow-lg"
                    : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/50"
                }`}
              >
                <t.Icon className="w-4 h-4 inline mr-2 -mt-0.5" />
                {t.label}
                <span
                  className={`ml-2 text-xs font-semibold ${
                    track === t.id ? "text-primary" : "text-slate-400 dark:text-zinc-400"
                  }`}
                >
                  {t.meta}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Track fact strip */}
        <div className="mb-10 flex flex-wrap justify-center gap-2.5 text-sm">
          {trackFacts[track].map((fact) => (
            <span
              key={fact}
              className="px-4 py-2 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 font-medium shadow-sm"
            >
              {fact}
            </span>
          ))}
        </div>

        <div className="max-w-4xl mx-auto" role="tabpanel" aria-label={`${track} curriculum`}>
          <Accordion key={track} type="single" collapsible className="space-y-4">
            {(track === "cscs" ? cscsModules : hybridModules).map((module, i) => (
              <AccordionItem
                key={module.id}
                value={module.id}
                className="border rounded-2xl px-6 bg-slate-50 dark:bg-zinc-900 data-[state=open]:bg-white dark:data-[state=open]:bg-zinc-800 data-[state=open]:shadow-xl transition-all border-slate-200 dark:border-white/10"
              >
                <AccordionTrigger className="hover:no-underline py-6 gap-4">
                  <div className="text-left flex items-start gap-4">
                    <span className="mt-0.5 shrink-0 w-9 h-9 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold mb-1.5">{module.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-primary/5 text-primary dark:bg-primary/20 border-none font-medium text-xs">
                          {module.chapters}
                        </Badge>
                        {module.practical && (
                          <Badge
                            variant="secondary"
                            className="bg-slate-200/70 text-slate-600 dark:bg-zinc-800/70 dark:text-zinc-300 border-none font-medium text-xs"
                          >
                            {module.practical}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8 pl-[3.25rem]">
                  <ul className="grid sm:grid-cols-2 gap-4">
                    {module.topics.map((topic, i2) => (
                      <li key={i2} className="flex items-start space-x-3 text-slate-600 dark:text-zinc-400">
                        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
