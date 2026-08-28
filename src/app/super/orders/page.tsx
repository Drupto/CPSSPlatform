"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAllOrders } from "@/lib/orders";
import { refundOrder } from "@/lib/admin";
import { formatINRPaise } from "@/lib/currency";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const statusBadge: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-200 text-slate-600",
};

export default function SuperOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      try {
        setOrders(await getAllOrders());
      } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to load orders.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [toast]);

  const handleRefund = async (order: Order) => {
    if (!confirm(`Refund ${formatINRPaise(order.amount)} for this ${order.type} order? A full course refund revokes the student's access.`)) return;
    setRefunding(order.id);
    try {
      const res = await refundOrder(order.id, true);
      toast({ title: "Refunded", description: `Refund ${res.status} · ${formatINRPaise(res.amountPaise)}` });
      setOrders(await getAllOrders());
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Refund failed.", variant: "destructive" });
    } finally {
      setRefunding(null);
    }
  };

  if (loading) return <p className="text-slate-600">Loading orders…</p>;

  return (
    <div className="space-y-3">
      {orders.length === 0 && <p className="text-slate-600">No orders yet.</p>}
      {orders.map((order) => (
        <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{order.type === "plan" ? "Plan" : "Course"} purchase</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusBadge[order.status]}`}>{order.status}</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Buyer: {order.buyerId} · {formatINRPaise(order.amount)} · {order.currency ?? "INR"}
            </p>
            <p className="text-xs text-slate-400">
              {order.courseId ? `course ${order.courseId}` : `plan ${order.planId ?? ""}`}
              {order.instituteId ? ` · institute ${order.instituteId}` : ""} · {fmtTs(order.createdAt)}
            </p>
            {order.commission !== undefined && (
              <p className="text-xs text-slate-400">
                Platform share: {formatINRPaise(order.commission)} · Inst. share: {formatINRPaise(order.instituteShare ?? 0)}
              </p>
            )}
          </div>
          {(order.status === "paid") && !(order.refund) && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={refunding === order.id} onClick={() => handleRefund(order)}>
              {refunding === order.id ? "Refunding…" : "Refund"}
            </Button>
          )}
          {order.refund && (
            <span className="text-xs text-slate-500">Refund: {formatINRPaise(order.refund.amount)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function fmtTs(value: unknown): string {
  if (!value) return "";
  const d = (value as { toDate?: () => Date }).toDate ? (value as { toDate: () => Date }).toDate() : new Date(value as string);
  return d.toLocaleString();
}