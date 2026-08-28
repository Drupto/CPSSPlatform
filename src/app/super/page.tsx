"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, isSuperProfile } from "@/lib/course";
import { getInstitutes, getPublishedPlans } from "@/lib/institute";
import { getAllOrders, sumOrders } from "@/lib/orders";
import { formatINRPaise } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Users, Building2, Package, Wallet, ArrowRight } from "lucide-react";

export default function SuperDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tallies, setTallies] = useState({
    institutes: 0,
    plans: 0,
    orders: 0,
    grossPaise: 0,
    commissionPaise: 0,
    pendingInstitutes: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (!isSuperProfile(profile)) {
        window.location.href = "/";
        return;
      }
      try {
        const [institutes, plans, orders] = await Promise.all([
          getInstitutes(),
          getPublishedPlans(),
          getAllOrders(),
        ]);
        const totals = sumOrders(orders);
        setTallies({
          institutes: institutes.length,
          plans: plans.length,
          orders: orders.filter((o) => o.status === "paid" || o.status === "refunded").length,
          grossPaise: totals.grossPaise,
          commissionPaise: totals.commissionPaise,
          pendingInstitutes: institutes.filter((i) => i.subscriptionStatus === "pending").length,
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p className="text-slate-600">Loading super admin dashboard…</p>;
  }

  const stats = [
    { label: "Institutes", value: tallies.institutes, icon: Building2, color: "bg-violet-500" },
    { label: "Plans", value: tallies.plans, icon: Package, color: "bg-emerald-500" },
    { label: "Orders", value: tallies.orders, icon: Users, color: "bg-blue-500" },
    { label: "Platform revenue (gross)", value: formatINRPaise(tallies.grossPaise), icon: Wallet, color: "bg-amber-500" },
    { label: "Commission earned", value: formatINRPaise(tallies.commissionPaise), icon: Wallet, color: "bg-rose-500" },
  ];

  return (
    <div>
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`${stat.color} rounded-lg p-2 text-white`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/super/institutes" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-primary transition flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Institutes</h2>
            <p className="text-slate-600">
              Approve, suspend, and review tenant accounts.
              {tallies.pendingInstitutes > 0 && (
                <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {tallies.pendingInstitutes} pending
                </span>
              )}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>
        <Link href="/super/orders" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-primary transition flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Orders</h2>
            <p className="text-slate-600">View the full purchase ledger and process refunds.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/super/plans">Manage Plans</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/super/payouts">Manage Payouts</Link>
        </Button>
      </div>
    </div>
  );
}