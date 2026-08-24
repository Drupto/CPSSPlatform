
"use client";

import Link from "next/link"
import Image from "next/image"
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
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="KINÉTIKA"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          
          <nav className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm font-medium text-slate-400" aria-label="Footer">
            <Link href="/courses" className="hover:text-white transition-colors">Courses</Link>
            <Link href="/#curriculum" className="hover:text-white transition-colors">Curriculum</Link>
            <Link href="/#instructor" className="hover:text-white transition-colors">Instructor</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
          </nav>

          <div className="text-sm text-slate-500">
            &copy; 2024 KINÉTIKA. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
