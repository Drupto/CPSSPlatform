
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export function Curriculum() {
  const modules = [
    {
      id: "module-1",
      title: "Module 1: Training Theory & Process",
      weights: "10-14% Scientific Disciplines | 3-6% Tech | 9-12% Research",
      topics: [
        "Biological adaptations to training load",
        "Periodization models for elite sport",
        "Individualization and specificity principles",
        "Interdisciplinary support team coordination"
      ]
    },
    {
      id: "module-2",
      title: "Module 2: Needs Analysis",
      weights: "11-15% Scientific Disciplines | 3-6% Tech | 7-11% Research",
      topics: [
        "Metabolic and biomechanical sport demands",
        "Profiling positional requirements",
        "Benchmarking across competition levels",
        "Injury epidemiology and risk assessment"
      ]
    },
    {
      id: "module-3",
      title: "Module 3: Acute & Chronic Monitoring",
      weights: "5-8% Scientific Disciplines | 10-14% Tech | 7-11% Research",
      topics: [
        "Wearable technology integration (GPS, HRV)",
        "Internal vs external load metrics",
        "Readiness and fatigue assessment protocols",
        "Data visualization for coaching staff"
      ]
    },
    {
      id: "module-4",
      title: "Module 4: Communication & Education",
      weights: "3-6% Scientific Disciplines | 3-7% Tech | 10-14% Research",
      topics: [
        "Translating complex data for non-scientists",
        "Implementing behavioral change strategies",
        "Designing effective performance reports",
        "Ethical considerations in sport science"
      ]
    }
  ];

  return (
    <section className="py-24 bg-white" id="curriculum">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-extrabold mb-4">Aligned Exactly to the NSCA CPSS Domains</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Our content weighting mirrors the actual exam specifications provided by the NSCA.</p>
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
