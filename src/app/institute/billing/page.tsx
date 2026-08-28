"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInstitute } from "@/hooks/use-institute";
import { getPlanById, getPublishedPlans } from "@/lib/institute";
import { formatPlanPrice } from "@/lib/currency";
import type { Plan } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function InstituteBillingPage() {
  const router = useRouter();
  const { institute, loading: loadingInst } = useInstitute();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingInst) return;
    if (!institute) {
      router.push("/");
      return;
    }
    (async () => {
      try {
        if (institute.planId) setPlan(await getPlanById(institute.planId));
        setPlans(await getPublishedPlans());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [institute, loadingInst, router]);

  if (loading) return <p className="text-slate-600">Loading billing…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Billing & subscription</h2>
        <p className="text-sm text-slate-500 mb-6">Your current plan, usage limits, and renewal.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-xl">
        {institute && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Current plan</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${institute.subscriptionStatus === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {institute.subscriptionStatus}
              </span>
            </div>
            <p className="text-slate-700">{plan ? `${plan.name} — ${formatPlanPrice(plan.priceInr, plan.period)}` : "No plan selected"}</p>
            {institute.planExpiresAt?.toDate && (
              <p className="text-sm text-slate-500 mt-1">
                Renewal: {institute.planExpiresAt.toDate().toLocaleDateString()}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-slate-500">Max courses</p>
                <p className="text-lg font-semibold">{institute.limits?.maxCourses ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-slate-500">Max students</p>
                <p className="text-lg font-semibold">{institute.limits?.maxStudents ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-slate-500">Storage</p>
                <p className="text-lg font-semibold">{institute.limits?.storageGb ?? "—"} GB</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-slate-500">Staff seats</p>
                <p className="text-lg font-semibold">{institute.limits?.staffSeats ?? "—"}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {plans.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Available plans</h3>
          <div className="space-y-3">
            {plans.map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-slate-500">{formatPlanPrice(p.priceInr, p.period)} · {p.commissionPct}% commission</p>
                </div>
                {p.id === institute?.planId ? (
                  <span className="text-sm text-slate-400">Current</span>
                ) : (
                  <Button size="sm" disabled>Upgrade (coming soon)</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}