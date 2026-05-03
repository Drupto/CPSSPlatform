import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/sections/hero";
import { Authority } from "@/components/sections/authority";
import { Features } from "@/components/sections/features";
import { Curriculum } from "@/components/sections/curriculum";
import { Instructor } from "@/components/sections/instructor";
import { Pricing } from "@/components/sections/pricing";
import { FAQ } from "@/components/sections/faq";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-slate-50 overflow-x-hidden">
      <Navbar />
      <Hero />
      <Authority />
      <Features />
      <Curriculum />
      <Instructor />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
