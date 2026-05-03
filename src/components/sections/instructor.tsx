import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function Instructor() {
  const img = PlaceHolderImages?.find(i => i.id === "instructor-portrait");

  return (
    <section className="py-24 bg-slate-50" id="instructor">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-[3xl] overflow-hidden shadow-xl border border-slate-100 flex flex-col md:flex-row items-stretch">
          <div className="md:w-1/2 relative min-h-[400px]">
            <Image
              src={img?.imageUrl || "https://picsum.photos/seed/sport-sci-1/600/800"}
              alt="Instructor Portrait"
              fill
              className="object-cover"
              data-ai-hint="sport scientist portrait"
            />
          </div>
          <div className="md:w-1/2 p-10 md:p-16 flex flex-col justify-center">
            <Badge className="w-fit mb-6 bg-secondary text-slate-900 border-none px-4 py-1">
              Approved / Aligned Resource
            </Badge>
            <h2 className="text-4xl font-extrabold mb-6 leading-tight">
              Built by a Practicing <br />
              <span className="text-primary">Sport Scientist</span>
            </h2>
            <div className="mb-6">
              <h3 className="text-2xl font-bold">Dr. James Maxwell</h3>
              <p className="text-primary font-semibold">PhD, CPSS, CSCS*D</p>
            </div>
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              James has spent over 15 years in high-performance sport, including 
              tenures with professional football organizations and Olympic 
              governing bodies. As a contributor to the field's research, he 
              designed this course to fill the gap between academic theory and 
              the rigorous NSCA certification requirements.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">1,000+</span>
                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Students Passed</span>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold">15+</span>
                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Years Experience</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
