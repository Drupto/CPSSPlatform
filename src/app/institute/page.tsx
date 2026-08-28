"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useInstitute } from "@/hooks/use-institute";
import { getCoursesForInstitute } from "@/lib/course";
import { getOrdersForInstitute, sumOrders } from "@/lib/orders";
import { getEnrollmentsForInstitute } from "@/lib/course-institute";
import { formatINRPaise } from "@/lib/currency";
import { BookOpen, Users, ReceiptText, Wallet, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InstituteDashboard() {
  const router = useRouter();
  const { institute, loading: loadingInst } = useInstitute();
  const [tallies, setTallies] = useState({ courses: 0, students: 0, sales: 0, earnedPaise: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingInst) return;
    if (!institute) {
      router.push("/");
      return;
    }
    (async () => {
      try {
        const [courses, orders, enrollments] = await Promise.all([
          getCoursesForInstitute(institute.id),
          getOrdersForInstitute(institute.id),
          getEnrollmentsForInstitute(institute.id),
        ]);
        const totals = sumOrders(orders);
        setTallies({
          courses: courses.length,
          students: new Set(enrollments.map((e) => e.userId)).size,
          sales: totals.count,
          earnedPaise: totals.instituteSharePaise,
        });
      } catch (err) {
        console.error("[institute dashboard]", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [institute, loadingInst, router]);

  if (loading) return <p className="text-slate-600">Loading dashboard…</p>;

  const stats = [
    { label: "Courses", value: tallies.courses, icon: BookOpen, color: "bg-violet-500" },
    { label: "Students", value: tallies.students, icon: Users, color: "bg-blue-500" },
    { label: "Paid sales", value: tallies.sales, icon: ReceiptText, color: "bg-emerald-500" },
    { label: "Earnings (net)", value: formatINRPaise(tallies.earnedPaise), icon: Wallet, color: "bg-amber-500" },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`${s.color} rounded-lg p-2 text-white`}>
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-slate-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/institute/courses" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-primary transition flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Courses</h2>
            <p className="text-slate-600">Create and manage your own courses for students.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>
        <Link href="/institute/orders" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-primary transition flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Sales</h2>
            <p className="text-slate-600">See who bought your courses and your net earnings.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>
        <Link href="/institute/students" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-primary transition flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Students</h2>
            <p className="text-slate-600">View enrolled students across your courses.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>
        <Link href="/institute/billing" className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-primary transition flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Billing</h2>
            <p className="text-slate-600">Review your subscription and plan limits.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}