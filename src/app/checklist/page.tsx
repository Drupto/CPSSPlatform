import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/footer";
import { ChecklistEnquiryForm } from "@/components/checklist/enquiry-form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Free CSCS Exam Prep Checklist",
  description:
    "Download the free KINÉTIKA CSCS exam prep checklist: a print-ready PDF covering exam facts, a 4-phase study plan, all 26 curriculum chapters, timed practice strategy, and exam-day tactics.",
  path: "/checklist",
  keywords: [
    "CSCS exam checklist",
    "CSCS study guide",
    "CSCS exam prep",
    "NSCA CSCS preparation",
    "strength and conditioning certification",
    "free fitness education resource",
  ],
});

export default function ChecklistPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main>
        <section className="py-24">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold uppercase tracking-wider mb-6">
                Free Resource
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                CSCS Exam Prep Checklist
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Tell us where to send your study motivation, and download the checklist
                instantly. Five print-ready pages that take you from first study session
                to exam day.
              </p>
            </div>

            <ChecklistEnquiryForm />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
