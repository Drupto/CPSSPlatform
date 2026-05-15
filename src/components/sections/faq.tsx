
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck } from "lucide-react";

export function FAQ() {
  const faqs = [
    {
      q: "What are the eligibility requirements for the CSCS?",
      a: "To sit for the CSCS exam, you must meet the NSCA's academic and experience requirements, typically a bachelor's degree in a related field plus practical experience. Our course prepares you for the exam content, not the eligibility process itself."
    },
    {
      q: "How long do I have access to the course?",
      a: "You have lifetime access. As long as the course exists, you can log in and study. This includes all future updates to course material at no extra cost."
    },
    {
      q: "Is this affiliated with the NSCA?",
      a: "We are an independent prep resource built by professional sport scientists. While our curriculum is strictly aligned with the NSCA's Exam Content Outline (ECO), we are not an official NSCA-branded product."
    },
    {
      q: "How is the exam formatted?",
      a: "The CSCS exam is split into two sections: Scientific Foundations and Practical/Applied. The Scientific Foundations section is 1.5 hours long with 80 scored and 15 non-scored multiple-choice questions covering exercise sciences, exercise physiology, and nutrition. The Practical/Applied section is 2.5 hours long with 110 scored and 15 non-scored multiple-choice questions covering exercise technique, program design, organization/administration, and testing/evaluation, including video-supported technique items."
    }
  ];

  return (
    <section className="py-24 bg-slate-50">
      <div className="container max-w-4xl mx-auto px-6">
        <div className="bg-primary/5 rounded-[3xl] p-8 md:p-12 mb-16 flex flex-col md:flex-row items-center gap-8 border border-primary/10 shadow-sm">
          <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center text-primary flex-shrink-0">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">30-Day Money-Back Guarantee</h3>
            <p className="text-slate-600 text-lg leading-relaxed">
              If you don't feel 10x more confident about the exam after going through our curriculum, 
              simply email us for a full refund. No questions asked.
            </p>
          </div>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold">Frequently Asked Questions</h2>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="bg-white rounded-2xl border-none shadow-sm px-6 overflow-hidden">
              <AccordionTrigger className="text-left py-6 font-bold hover:no-underline text-lg">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pb-6 text-slate-600 text-lg leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
