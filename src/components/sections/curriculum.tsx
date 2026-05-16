
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export function Curriculum() {
  const modules = [
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

  return (
    <section className="py-24 bg-white" id="curriculum">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-extrabold mb-4">Complete Strength & Conditioning Curriculum</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Master all 26 chapters covering scientific foundations, exercise techniques, program design, testing & evaluation, and facility administration.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {modules.map((module) => (
              <AccordionItem key={module.id} value={module.id} className="border rounded-2xl px-6 bg-slate-50 data-[state=open]:bg-white data-[state=open]:shadow-xl transition-all border-slate-200">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="text-left">
                    <h3 className="text-xl font-bold mb-1">{module.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-medium text-xs">
                        {module.chapters}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-8">
                  <ul className="grid sm:grid-cols-2 gap-4">
                    {module.topics.map((topic, i) => (
                      <li key={i} className="flex items-center space-x-3 text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
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
