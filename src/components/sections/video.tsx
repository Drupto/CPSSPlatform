import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function VideoSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white" id="video">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/40">Introduction</Badge>
          <h2 className="text-4xl font-extrabold mb-4">Meet Your Course</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Watch this brief introduction to understand what's included in the CSCS Prep Course and how it can help you pass the exam.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Video Container - Responsive */}
          <div className="relative bg-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl aspect-video flex items-center justify-center group">
            {/* Placeholder for Video */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            
            <div className="relative z-10 text-center">
              <div className="mb-6 inline-flex">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <Play className="w-12 h-12 text-primary fill-primary ml-1" />
                </div>
              </div>
              <p className="text-slate-300 text-lg font-medium">
                Video Player Coming Soon
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Share your video link or file to embed it here
              </p>
            </div>

            {/* Alternative: If you have a YouTube/Vimeo link, replace with this pattern:
            <iframe
              width="100%"
              height="100%"
              src="YOUR_VIDEO_URL"
              title="CSCS Prep Course Introduction"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0"
            />
            */}
          </div>

          {/* Video Info */}
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Duration</h3>
              <p className="text-slate-400">~5-10 minutes</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Quick Overview</h3>
              <p className="text-slate-400">Course structure & benefits</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Motivating</h3>
              <p className="text-slate-400">Success stories included</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
