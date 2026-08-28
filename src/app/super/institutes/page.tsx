"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getInstitutes } from "@/lib/institute";
import { setInstituteStatus } from "@/lib/admin";
import { getUserProfile } from "@/lib/course";
import type { Institute, SubscriptionStatus, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";

const badge: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-amber-100 text-amber-700",
  expired: "bg-slate-200 text-slate-600",
  pending: "bg-blue-100 text-blue-700",
};

export default function SuperInstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [owners, setOwners] = useState<Record<string, UserProfile | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    const list = await getInstitutes();
    setInstitutes(list);
    const ownerMap: Record<string, UserProfile | null> = {};
    await Promise.all(
      list.map(async (inst) => {
        try {
          ownerMap[inst.ownerUid] = await getUserProfile(inst.ownerUid);
        } catch {
          ownerMap[inst.ownerUid] = null;
        }
      })
    );
    setOwners(ownerMap);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      try {
        await reload();
      } catch (e) {
        console.error(e);
        setError("Failed to load institutes.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const changeStatus = async (inst: Institute, status: SubscriptionStatus) => {
    setBusy(inst.id);
    setError("");
    try {
      await setInstituteStatus(inst.id, status);
      await reload();
    } catch (e) {
      console.error(e);
      setError("Failed to update institute status.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="text-slate-600">Loading institutes…</p>;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {institutes.length === 0 && <p className="text-slate-600">No institutes yet. Institutes appear after a plan purchase.</p>}

      {institutes.map((inst) => {
        const owner = owners[inst.ownerUid];
        return (
          <div key={inst.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{inst.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge[inst.subscriptionStatus]}`}>
                  {inst.subscriptionStatus}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Owner: {owner?.displayName || owner?.email || inst.ownerUid}</p>
              <p className="text-xs text-slate-400">
                Instance: {inst.slug} · Plan: {inst.planId ?? "—"}
                {inst.planExpiresAt?.toDate ? ` · expires ${inst.planExpiresAt.toDate().toLocaleDateString()}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {inst.subscriptionStatus !== "active" && (
                <Button size="sm" disabled={busy === inst.id} onClick={() => changeStatus(inst, "active")}>
                  Activate
                </Button>
              )}
              {inst.subscriptionStatus !== "suspended" && (
                <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" disabled={busy === inst.id} onClick={() => changeStatus(inst, "suspended")}>
                  Suspend
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}