import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function Instructor() {
  const img = PlaceHolderImages?.find(i => i.id === "instructor-portrait");

  const credentials = [
    "NSCA CSCS (Certified Strength and Conditioning Specialist)",
    "ACE CPT (Certified Personal Trainer)",
    "EREPS CPT",
    "NSDC Master Trainer",
    "B.P.Ed",
    "B.Sc",
    "MBA",
    "Certified Yoga Instructor",
    "Pre & Post Natal Exercise Specialist",
    "FTS"
  ];

  return (
    <section className="py-24 bg-slate-50" id="instructor">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-[3xl] overflow-hidden shadow-xl border border-slate-100 flex flex-col md:flex-row items-stretch">
          <div className="md:w-1/2 relative min-h-[400px]">
            <Image
              src={img?.imageUrl || "https://picsum.photos/seed/trainer-1/600/800"}
              alt="Instructor Portrait"
              fill
              className="object-cover"
              data-ai-hint="fitness trainer portrait"
            />
          </div>
          <div className="md:w-1/2 p-10 md:p-16 flex flex-col justify-center">
            <Badge className="w-fit mb-6 bg-secondary text-slate-900 border-none px-4 py-1">
              Meet Your Instructor
            </Badge>
            <h2 className="text-4xl font-extrabold mb-2 leading-tight">
              <span className="text-slate-900">PRAKHAR BHATNAGAR</span>
            </h2>
            <p className="text-primary font-bold text-xl mb-8">Master Trainer</p>
            
            <p className="text-slate-600 text-lg leading-relaxed mb-10">
              With a unique blend of academic excellence and practical expertise, Prakhar brings a comprehensive approach to fitness education. His diverse credentials and certifications ensure you receive instruction grounded in both scientific rigor and real-world application.
            </p>

            <div className="mb-10">
              <div className="flex items-center gap-2 mb-6">
                <Award className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-bold text-slate-900">Credentials & Certifications</h3>
              </div>
              <ul className="space-y-3">
                {credentials.map((credential, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-1 p-0.5 rounded-full bg-primary/20">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-slate-700 font-medium">{credential}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-6 pt-8 border-t border-slate-200">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">10+</span>
                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Years of Experience</span>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">Multi-Disciplinary</span>
                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Expertise</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
