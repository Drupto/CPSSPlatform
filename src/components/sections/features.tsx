
import { Video, ClipboardCheck, Search, Infinity } from "lucide-react";

export function Features() {
  const features = [
    {
      title: "Chapter-by-Chapter Lectures",
      description: "30+ hours of video walking you through every chapter of the Essentials of Sport Science textbook.",
      icon: <Video className="w-8 h-8" />,
    },
    {
      title: "Domain-Aligned Quizzes",
      description: "Reinforce Scientific Disciplines, Assessment Tech, and Research Process with targeted practice.",
      icon: <ClipboardCheck className="w-8 h-8" />,
    },
    {
      title: "Case Study Frameworks",
      description: "Step-by-step methods to tackle Athlete and Research scenarios like a seasoned pro scientist.",
      icon: <Search className="w-8 h-8" />,
    },
    {
      title: "Lifetime Access",
      description: "Study at your own pace. Access never expires and we provide free updates when the exam changes.",
      icon: <Infinity className="w-8 h-8" />,
    },
  ];

  return (
    <section className="py-24 bg-slate-50">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-4xl font-extrabold mb-4">Everything You Need to Pass.</h2>
          <p className="text-xl text-slate-600">Nothing you don't. A curriculum focused entirely on exam performance.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-6 p-8 bg-white rounded-3xl shadow-lg border border-slate-100 hover:border-primary/20 transition-colors">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
