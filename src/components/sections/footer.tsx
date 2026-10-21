
"use client";

import Link from "next/link"
import Image from "next/image"
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { contactHref, siteConfig } from "@/lib/seo";

export function Footer() {
  const router = useRouter();
  return (
    <footer className="bg-slate-950 text-white dark:bg-zinc-950 dark:text-white">
      <div className="container max-w-6xl mx-auto px-6">
        {/* Final CTA */}
        <div className="py-24 border-b border-white/10 dark:border-zinc-800 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-8 max-w-3xl mx-auto leading-tight">
            Ready to become a CSCS or Certified Hybrid Performance Coach?
          </h2>
          <Button 
            size="lg" 
            className="h-16 px-12 text-xl font-bold rounded-full shadow-2xl shadow-primary/20"
            onClick={() => router.push("/auth")}
          >
            Enroll Now
          </Button>
          <p className="mt-8 text-slate-500 font-medium dark:text-zinc-400">
            Join 1,200+ sport science professionals globally.
          </p>
        </div>

        {/* Footer Links */}
        <div className="py-12 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="KINÉTIKA"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </Link>

            <nav className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm font-medium text-slate-400 dark:text-zinc-400" aria-label="Footer">
              <Link href="/courses" className="hover:text-white transition-colors">Courses</Link>
              <Link href="/#curriculum" className="hover:text-white transition-colors">Curriculum</Link>
              <Link href="/#instructor" className="hover:text-white transition-colors">Instructor</Link>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            </nav>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 dark:border-zinc-800 dark:text-zinc-400 md:flex-row">
            <a
              href={contactHref}
              className="inline-flex items-center gap-2 font-medium text-slate-400 transition-colors hover:text-white dark:text-zinc-300"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {siteConfig.email}
            </a>

            <div>
              &copy; 2026 KINÉTIKA. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
