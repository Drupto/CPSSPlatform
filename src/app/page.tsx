import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/sections/hero";
import { Authority } from "@/components/sections/authority";
import { Features } from "@/components/sections/features";
import { Curriculum } from "@/components/sections/curriculum";
import { Instructor } from "@/components/sections/instructor";
import { Testimonials } from "@/components/sections/testimonials";
import { Pricing } from "@/components/sections/pricing";
import { FAQ } from "@/components/sections/faq";
import { Footer } from "@/components/sections/footer";
import { JsonLd } from "@/components/json-ld";
import { buildMetadata, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { homepageFaqs } from "@/lib/faq-data";

export const metadata: Metadata = buildMetadata({
  title: "KINÉTIKA | Redefining Fitness Education",
  description:
    "Master the science of fitness with KINÉTIKA's evidence-based CSCS exam prep courses. 30+ hours of video, 150+ practice questions, and self-paced learning for future Certified Strength and Conditioning Specialists.",
  path: "/",
  keywords: [
    "CSCS exam prep",
    "Certified Strength and Conditioning Specialist",
    "NSCA CSCS preparation",
    "fitness education platform",
    "strength and conditioning course",
    "exercise science certification",
    "sports performance training",
    "evidence-based fitness course",
  ],
});

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-slate-50 overflow-x-hidden">
      <JsonLd
        data={[
          faqJsonLd(homepageFaqs),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
          ]),
        ]}
      />
      <Navbar />
      <Hero />
      <Authority />
      <Features />
      <Curriculum />
      <Instructor />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}