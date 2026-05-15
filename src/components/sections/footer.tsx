
"use client";

import Link from "next/link"
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function Footer() {
  const router = useRouter();
  return (
    <footer className="bg-slate-950 text-white">
      <div className="container max-w-6xl mx-auto px-6">
        {/* Final CTA */}
        <div className="py-24 border-b border-white/10 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-8 max-w-3xl mx-auto leading-tight">
            Ready to become a Certified Strength and Conditioning Specialist?
          </h2>
          <Button 
            size="lg" 
            className="h-16 px-12 text-xl font-bold rounded-full shadow-2xl shadow-primary/20"
            onClick={() => router.push("/auth")}
          >
            Enroll Now
          </Button>
          <p className="mt-8 text-slate-500 font-medium">
            Join 1,200+ sport science professionals globally.
          </p>
        </div>

        {/* Footer Links */}
        <div className="py-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-2xl font-bold">
            CSCS<span className="text-primary">ProPass</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Course</a>
            <a href="#" className="hover:text-white transition-colors">Curriculum</a>
            <a href="#" className="hover:text-white transition-colors">Instructor</a>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>

          <div className="text-sm text-slate-500">
            &copy; 2024 CSCS ProPass. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
