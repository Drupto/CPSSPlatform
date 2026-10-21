import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function Instructor() {
  const img = PlaceHolderImages?.find(i => i.id === "instructor-portrait");
  const instructorPhoto = "https://res.cloudinary.com/dziccfxut/image/upload/v1792577233/Kinetika_Train_Learn_Grow_Poster_yumtva.png"

  const credentials = [
    "NSCA CSCS (Certified Strength and Conditioning Specialist)",
    "ACE CPT (Certified Personal Trainer)",
    "NSDC Master Trainer",
    "B.P.Ed",
    "B.Sc",
    "MBA",
    "Certified Yoga Instructor",
    "Pre & Post Natal Exercise Specialist",
    "FTS"
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-zinc-950" id="instructor">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="bg-white dark:bg-zinc-900 rounded-[3xl] overflow-hidden shadow-xl border border-slate-100 dark:border-white/10 flex flex-col md:flex-row items-stretch">
          <div className="relative h-[520px] md:h-auto md:w-1/2 bg-black">
            <Image
              src={instructorPhoto}
              alt="Instructor Portrait"
              fill
              className="object-contain"
              data-ai-hint="fitness trainer portrait poster"
            />
          </div>
          <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <Badge className="w-fit mb-5 bg-secondary text-slate-900 dark:text-zinc-100 border-none px-4 py-1">
              Meet Your Instructor
            </Badge>
            <h2 className="text-4xl font-extrabold mb-2 leading-tight">
              <span className="text-slate-900 dark:text-zinc-100">PRAKHAR BHATNAGAR</span>
            </h2>
            <p className="text-primary font-bold text-xl mb-8">Master Trainer</p>
            
            <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-8 dark:text-zinc-400">
              With a unique blend of academic excellence and practical expertise, Prakhar brings a comprehensive approach to fitness education. His diverse credentials and certifications ensure you receive instruction grounded in both scientific rigor and real-world application.
            </p>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Credentials &amp; Certifications</h3>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                {credentials.map((credential, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-1 p-0.5 rounded-full bg-primary/20 dark:bg-primary/30 flex-shrink-0">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-slate-700 text-sm font-medium dark:text-zinc-300">{credential}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-6 pt-6 border-t border-slate-200 dark:border-white/10">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900 dark:text-zinc-100">10+</span>
                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold dark:text-zinc-400">Years of Experience</span>
              </div>
              <div className="w-px h-12 bg-slate-200 dark:bg-white/10" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Multi-Disciplinary</span>
                <span className="text-sm text-slate-500 uppercase tracking-wider font-semibold dark:text-zinc-400">Expertise</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
