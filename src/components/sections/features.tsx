
import { Layers, ClipboardCheck, Scale, Infinity } from "lucide-react";

export function Features() {
  const features = [
    {
      title: "Systems, Not Templates",
      description: "Assessment-driven frameworks — from CSCS exam domains to the Hybrid ASSESS → ADAPT coaching loop — so you can think like a coach, not memorize a plan.",
      icon: <Layers className="w-8 h-8" />,
    },
    {
      title: "Strength + Endurance Integration",
      description: "Concurrent training, the interference effect, compromised running, and periodization — the exact skills hybrid athletes demand.",
      icon: <ClipboardCheck className="w-8 h-8" />,
    },
    {
      title: "Exam + Coaching Outcomes",
      description: "Domain-aligned CSCS prep on one track; real-world case studies and a capstone coaching project on the other.",
      icon: <Scale className="w-8 h-8" />,
    },
    {
      title: "Lifetime Access",
      description: "Study at your own pace. Access never expires and we provide free updates when exams or course material change.",
      icon: <Infinity className="w-8 h-8" />,
    },
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-zinc-950">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-4xl font-extrabold mb-4">Everything You Need to Coach and Certify.</h2>
          <p className="text-xl text-slate-600 dark:text-zinc-400">Two programs, one standard: evidence-based, assessment-driven, and built for real-world performance.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-6 p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-lg border border-slate-100 dark:border-white/10 hover:border-primary/20 transition-colors">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/5 dark:bg-primary/20 flex items-center justify-center text-primary">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed dark:text-zinc-400">
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
