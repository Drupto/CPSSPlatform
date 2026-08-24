 
"use client";
 
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck } from "lucide-react";
import { homepageFaqs as faqs } from "@/lib/faq-data";

export function FAQ() {

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
