"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInstitute } from "@/hooks/use-institute";
import { getOrdersForInstitute, sumOrders } from "@/lib/orders";
import { getCourseById } from "@/lib/course";
import { formatINRPaise } from "@/lib/currency";
import type { Order } from "@/lib/types";

interface Row {
  order: Order;
  courseTitle: string;
}

export default function InstituteSalesPage() {
  const router = useRouter();
  const { institute, loading: loadingInst } = useInstitute();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingInst) return;
    if (!institute) {
      router.push("/");
      return;
    }
    (async () => {
      try {
        const orders = await getOrdersForInstitute(institute.id);
        const withCourse = await Promise.all(
          orders.map(async (order) => {
            const course = order.courseId ? await getCourseById(order.courseId).catch(() => null) : null;
            return { order, courseTitle: course?.title ?? (order.type === "plan" ? "Plan purchase" : "Course") };
          })
        );
        setRows(withCourse);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [institute, loadingInst, router]);

  if (loading) return <p className="text-slate-600">Loading sales…</p>;

  const totals = sumOrders(rows.map((r) => r.order));

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Sales</h2>
      <p className="text-sm text-slate-500 mb-6">
        Gross: {formatINRPaise(totals.grossPaise)} · Your share: {formatINRPaise(totals.instituteSharePaise)} · Platform commission: {formatINRPaise(totals.commissionPaise)} · Refunded: {formatINRPaise(totals.refundedPaise)}
      </p>

      {rows.length === 0 && <p className="text-slate-600">No sales yet.</p>}

      <div className="space-y-3">
        {rows.map(({ order, courseTitle }) => (
          <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{courseTitle}</p>
              <p className="text-sm text-slate-500 mt-1">
                {order.buyerName || order.buyerEmail || order.buyerId}
              </p>
              <p className="text-xs text-slate-400">
                {formatINRPaise(order.amount)} ·{" "}
                <span className={order.status === "paid" ? "text-emerald-600" : order.status === "refunded" ? "text-slate-500" : "text-amber-600"}>
                  {order.status}
                </span>
                {order.refund ? ` · refunded ${formatINRPaise(order.refund.amount)}` : ""}
                {order.createdAt?.toDate ? ` · ${order.createdAt.toDate().toLocaleDateString()}` : ""}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-slate-500">Your share</p>
              <p className="font-semibold text-slate-900">{formatINRPaise(order.instituteShare ?? 0)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}