
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="container max-w-6xl mx-auto px-6">
        {/* Final CTA */}
        <div className="py-24 border-b border-white/10 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-8 max-w-3xl mx-auto leading-tight">
            Ready to become a Certified Performance & Sport Scientist?
          </h2>
          <Button size="lg" className="h-16 px-12 text-xl font-bold rounded-full shadow-2xl shadow-primary/20">
            Enroll Now
          </Button>
          <p className="mt-8 text-slate-500 font-medium">
            Join 1,200+ sport science professionals globally.
          </p>
        </div>

        {/* Footer Links */}
        <div className="py-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-2xl font-bold">
            CPSS<span className="text-primary">ProPass</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Course</a>
            <a href="#" className="hover:text-white transition-colors">Curriculum</a>
            <a href="#" className="hover:text-white transition-colors">Instructor</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>

          <div className="text-sm text-slate-500">
            &copy; 2024 CPSS ProPass. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
