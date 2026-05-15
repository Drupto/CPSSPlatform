
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export function Curriculum() {
  const modules = [
    {
      id: "module-1",
      title: "Scientific Foundations",
      weights: "1.5 hours | 80 scored + 15 non-scored questions",
      topics: [
        "Exercise Sciences: muscle anatomy, neuromuscular physiology, biomechanics, bone and connective tissue, bioenergetics",
        "Exercise Physiology: neuroendocrine function, cardiopulmonary response, training adaptations, athlete differences, sport psychology",
        "Nutrition: performance nutrition, hydration, eating disorders, ergogenic aids"
      ]
    },
    {
      id: "module-2",
      title: "Exercise Technique",
      weights: "38 scored questions (video-supported technique assessment)",
      topics: [
        "Teach and evaluate resistance training technique for free weights, machines, alternative implements",
        "Plyometric, speed/sprint, agility, metabolic conditioning, and flexibility technique",
        "Spotting procedures and safety for complex lifts"
      ]
    },
    {
      id: "module-3",
      title: "Program Design",
      weights: "39 scored questions",
      topics: [
        "Program design based on athlete health, training age, goals, and sport demand",
        "Exercise selection, order, intensity, volume, work/rest, recovery, and progression",
        "Periodization models and reconditioning programs for injured athletes"
      ]
    },
    {
      id: "module-4",
      title: "Organization & Administration",
      weights: "13 scored questions",
      topics: [
        "Facility design, equipment layout, and operational policies",
        "Staff roles, safety procedures, and liability mitigation",
        "Creating a safe training environment and referral process"
      ]
    },
    {
      id: "module-5",
      title: "Testing & Evaluation",
      weights: "20 scored questions",
      topics: [
        "Selecting and administering valid, reliable performance tests",
        "Data collection, equipment use, and testing protocols",
        "Interpreting results and modifying programs based on athlete performance"
      ]
    }
  ];

  return (
    <section className="py-24 bg-white" id="curriculum">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-extrabold mb-4">Aligned Exactly to the NSCA CSCS Exam Content Outline</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Our content mirrors the official CSCS exam structure so you're studying the correct Scientific Foundations and Practical/Applied domains.</p>
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
                        {module.weights}
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
