"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getPayouts, markPayoutPaid } from "@/lib/admin";
import { formatINRPaise } from "@/lib/currency";
import type { Payout } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SuperPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      try {
        setPayouts(await getPayouts());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const settle = async (p: Payout) => {
    setBusy(p.id);
    try {
      await markPayoutPaid(p.id, refs[p.id]);
      setPayouts(await getPayouts());
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="text-slate-600">Loading payouts…</p>;

  return (
    <div className="space-y-3">
      {payouts.length === 0 && (
        <p className="text-slate-600">No payouts yet. Payouts are created per institute from settled order earnings.</p>
      )}
      {payouts.map((p) => (
        <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">{formatINRPaise(p.amount)}</h3>
            <p className="text-sm text-slate-500 mt-1">
              Institute: {p.instituteId} · Status:{" "}
              <span className={p.status === "paid" ? "text-emerald-600" : p.status === "failed" ? "text-red-600" : "text-amber-600"}>
                {p.status}
              </span>
            </p>
            <p className="text-xs text-slate-400">Orders included: {p.orderIds?.length ?? 0}</p>
          </div>
          {p.status === "pending" && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Bank ref (optional)"
                value={refs[p.id] ?? ""}
                onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
                className="w-44"
              />
              <Button size="sm" disabled={busy === p.id} onClick={() => settle(p)}>
                {busy === p.id ? "…" : "Mark paid"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}