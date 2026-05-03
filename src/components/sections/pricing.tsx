
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Pricing() {
  const plans = [
    {
      name: "Practice Exam Pack",
      price: "69",
      features: [
        "50+ Domain-Aligned Questions",
        "2 Comprehensive Case Studies",
        "Detailed Answer Explanations",
        "PDF Study Outlines",
        "One-time Download"
      ],
      cta: "Get Access",
      popular: false,
    },
    {
      name: "Full CPSS Prep Course",
      price: "249",
      features: [
        "All 30+ Video Lessons",
        "150+ Practice Questions",
        "Lifetime Course Access",
        "Free Updates for Life",
        "Mobile App Access",
        "Domain-Specific Quizzes"
      ],
      cta: "Get Access",
      popular: true,
    },
    {
      name: "Ultimate Bundle",
      price: "297",
      features: [
        "Everything in Full Course",
        "Bonus 1-on-1 Q&A Call",
        "Complete Practice Exam Pack",
        "Priority Support",
        "Bonus: Data Vis Toolkit",
        "Private Study Community"
      ],
      cta: "Get Access",
      popular: false,
    }
  ];

  return (
    <section className="py-24 bg-white" id="pricing">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4">Choose Your Prep Plan</h2>
          <p className="text-slate-600">Select the path that fits your studying style and timeline.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-center">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-10 rounded-[2.5rem] border-2 transition-all duration-500 ${
                plan.popular 
                  ? "bg-slate-900 text-white border-primary scale-105 shadow-2xl z-10" 
                  : "bg-slate-50 border-transparent shadow-lg text-slate-900"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white border-none px-6 py-1 text-sm font-bold rounded-full">
                  MOST POPULAR
                </Badge>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">{plan.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold">${plan.price}</span>
                  <span className="ml-1 text-slate-500 font-medium">USD</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`mt-1 p-0.5 rounded-full ${plan.popular ? "bg-primary" : "bg-primary/20"}`}>
                      <Check className={`w-3.5 h-3.5 ${plan.popular ? "text-white" : "text-primary"}`} />
                    </div>
                    <span className={plan.popular ? "text-slate-300" : "text-slate-600"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full h-14 rounded-2xl text-lg font-bold ${
                  plan.popular ? "bg-primary hover:bg-primary/90" : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
