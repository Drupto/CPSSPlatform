"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Pricing() {
  const router = useRouter();
  const plans = [
    {
      name: "Certified Hybrid Performance Coach - Level 1",
      tagline: "For coaches building a hybrid / HYROX coaching practice.",
      price: "4,999",
      compareAt: "7,999",
      save: "Save ₹3,000",
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
    },
    {
      name: "Full CSCS Prep Course",
      tagline: "For candidates preparing for the NSCA CSCS exam.",
      price: "10,000",
      features: [
        "All 26 chapter-by-chapter video lectures",
        "150+ practice questions + domain-aligned quizzes",
        "Case study frameworks for athlete & research scenarios",
        "Lifetime course access (no expiration)",
        "Free updates for life",
        "Course completion certificate"
      ],
      cta: "Get Access",
      popular: true,
    },
    {
      name: "Ultimate Bundle",
      tagline: "For serious candidates who want personal coaching too.",
      price: "30,000",
      features: [
        "Everything in Full CSCS Prep Course",
        "1-on-1 Live Class: personalized coaching",
        "Priority Support: fast responses",
        "Private Study Community: exclusive group access",
        "Lifetime access & free updates",
        "Course completion certificate"
      ],
      cta: "Get Access",
      popular: false,
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-zinc-900" id="pricing">
      <div className="container max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <Badge className="w-fit mx-auto mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1">
            One-Time Payment · Lifetime Access
          </Badge>
          <h2 className="text-4xl font-extrabold mb-4">Choose Your Course.</h2>
          <p className="text-slate-600 dark:text-zinc-400 text-lg">
            Select the program that matches your goal — CSCS exam mastery or Hybrid Performance
            coaching. No subscriptions, no hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-6 max-w-7xl mx-auto items-stretch">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative flex flex-col p-8 rounded-[2rem] border-2 transition-all duration-500 ${
                plan.popular
                  ? "bg-slate-900 dark:bg-zinc-950 text-white border-primary lg:scale-105 shadow-2xl z-10"
                  : "bg-slate-50 dark:bg-zinc-800 border-transparent dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:shadow-xl hover:-translate-y-1"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white border-none px-6 py-1 text-sm font-bold rounded-full whitespace-nowrap">
                  MOST POPULAR
                </Badge>
              )}
              {plan.badge && (
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white border-none px-4 py-1 text-xs font-bold rounded-full whitespace-nowrap">
                  {plan.badge}
                </Badge>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2 leading-snug">{plan.name}</h3>
                <p className={`text-sm ${plan.popular ? "text-slate-400 dark:text-zinc-300" : "text-slate-500 dark:text-zinc-400"}`}>
                  {plan.tagline}
                </p>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-6">
                <span className="text-5xl font-extrabold">₹{plan.price}</span>
                {plan.compareAt && (
                  <span className={`text-lg line-through ${plan.popular ? "text-slate-500 dark:text-zinc-400" : "text-slate-400 dark:text-zinc-300"}`}>
                    ₹{plan.compareAt}
                  </span>
                )}
                {plan.save && (
                  <span className="text-xs font-bold uppercase tracking-wider rounded-full bg-primary/15 dark:bg-primary/20 text-primary px-2.5 py-1">
                    {plan.save}
                  </span>
                )}
              </div>

              <ul className="space-y-3.5 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`mt-1 p-0.5 rounded-full flex-shrink-0 ${plan.popular ? "bg-primary" : "bg-primary/20"}`}>
                      <Check className={`w-3.5 h-3.5 ${plan.popular ? "text-white" : "text-primary"}`} />
                    </div>
                    <span className={plan.popular ? "text-slate-300 dark:text-zinc-300 text-sm" : "text-slate-600 dark:text-zinc-400 text-sm"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full h-14 rounded-2xl text-lg font-bold ${
                  plan.popular ? "bg-primary hover:bg-primary/90" : "bg-slate-900 dark:bg-zinc-800 text-white hover:bg-slate-800 dark:hover:bg-zinc-700"
                }`}
                onClick={() => router.push("/courses")}
              >
                {plan.cta}
              </Button>

              <p className={`mt-4 text-xs text-center ${plan.popular ? "text-slate-400 dark:text-zinc-300" : "text-slate-500 dark:text-zinc-400"}`}>
                One-time payment · Lifetime access
              </p>
            </div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-600 dark:text-zinc-400">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Secure UPI payment (KOTAK)
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Lifetime access &amp; free updates
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Course completion certificate
          </span>
        </div>
      </div>
    </section>
  );
}
