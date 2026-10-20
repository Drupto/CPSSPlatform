"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Pricing() {
  const router = useRouter();
  const plans = [
    {
      name: "Full CSCS Prep Course",
      price: "10,000",
      features: [
        "All chapter-by-chapter video lectures",
        "150+ practice questions",
        "Lifetime course access (no expiration)",
        "Free updates for life",
        "Domain-specific quizzes for each chapter",
        "Course completion certificate"
      ],
      cta: "Get Access",
      popular: true,
    },
    {
      name: "Certified Hybrid Performance Coach - Level 1",
      price: "4,999",
      badge: "LAUNCH OFFER — FIRST 20 STUDENTS",
      features: [
        "60-75 hrs: self-paced video + manual + assignments + case studies",
        "8 case studies + full capstone coaching project",
        "Assessment-driven system for real athletes",
        "Strength × Endurance × Running × Recovery",
        "HYROX race application + periodization",
        "Course completion certificate"
      ],
      cta: "Get Access",
      popular: false,
    }
  ];

  return (
    <section className="py-24 bg-white" id="pricing">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4">Choose Your Course.</h2>
          <p className="text-slate-600">Select the program that matches your goal — CSCS exam mastery or Hybrid Performance coaching.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto items-stretch">
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
              {plan.badge && (
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white border-none px-6 py-1 text-xs font-bold rounded-full">
                  {plan.badge}
                </Badge>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">{plan.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold">₹{plan.price}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`mt-1 p-0.5 rounded-full flex-shrink-0 ${plan.popular ? "bg-primary" : "bg-primary/20"}`}>
                      <Check className={`w-3.5 h-3.5 ${plan.popular ? "text-white" : "text-primary"}`} />
                    </div>
                    <span className={plan.popular ? "text-slate-300 text-sm" : "text-slate-600 text-sm"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full h-14 rounded-2xl text-lg font-bold ${
                  plan.popular ? "bg-primary hover:bg-primary/90" : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
                onClick={() => router.push("/courses")}
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
