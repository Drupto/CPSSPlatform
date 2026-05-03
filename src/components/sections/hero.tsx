import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-slate-950 text-white">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-6 relative z-10">
        <div className="max-w-3xl">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-bottom-2">
            NSCA CPSS Exam Prep
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Pass the CPSS Exam <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
              on Your First Try.
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-2xl">
            Stop guessing what's on the test. Our chapter-by-chapter video course, 
            based on the Essentials of Sport Science textbook, gives you the exact 
            framework to pass the NSCA's most advanced certification.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-full group">
              Start Studying Now
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="ghost" className="h-14 px-8 text-lg font-semibold rounded-full border border-white/10 hover:bg-white/5">
              Download Free Checklist
              <Play className="ml-2 w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-8">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-slate-300 font-medium">30+ Hours of Video</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-slate-300 font-medium">150+ Practice Questions</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-slate-300 font-medium">Self-Paced Learning</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
