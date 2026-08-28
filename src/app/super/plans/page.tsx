"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAllPlans, getInstitutes } from "@/lib/institute";
import { createPlan, deletePlan, updatePlan, type PlanInput } from "@/lib/admin";
import { formatPlanPrice } from "@/lib/currency";
import type { Plan, PlanLimits } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2 } from "lucide-react";

const emptyLimits: PlanLimits = { maxCourses: 0, maxStudents: 0, storageGb: 0, staffSeats: 0 };

export default function SuperPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [instituteCounts, setInstituteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanInput>({
    name: "",
    description: "",
    priceInr: 999,
    period: "monthly",
    commissionPct: 15,
    limits: { ...emptyLimits },
    published: true,
  });

  const reload = async () => {
    const [p, inst] = await Promise.all([getAllPlans(), getInstitutes()]);
    setPlans(p);
    const counts: Record<string, number> = {};
    for (const i of inst) if (i.planId) counts[i.planId] = (counts[i.planId] ?? 0) + 1;
    setInstituteCounts(counts);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        await reload();
      } catch (e) {
        console.error(e);
        setError("Failed to load plans.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const setLimits = (key: keyof PlanLimits, value: number) =>
    setForm((f) => ({ ...f, limits: { ...f.limits, [key]: Math.max(0, value) } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (editing) {
        await updatePlan(editing.id, form);
        setMessage("Plan updated.");
      } else {
        await createPlan(form);
        setMessage("Plan created.");
      }
      setEditing(null);
      setForm({ name: "", description: "", priceInr: 999, period: "monthly", commissionPct: 15, limits: { ...emptyLimits }, published: true });
      await reload();
    } catch (err) {
      console.error(err);
      setError("Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Delete plan "${plan.name}"? Existing institutes are unaffected.`)) return;
    try {
      await deletePlan(plan.id);
      await reload();
    } catch (e) {
      console.error(e);
      setError("Failed to delete plan.");
    }
  };

  const startEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      priceInr: plan.priceInr,
      period: plan.period,
      commissionPct: plan.commissionPct,
      limits: plan.limits ?? { ...emptyLimits },
      published: plan.published,
    });
  };

  if (loading) return <p className="text-slate-600">Loading plans…</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 h-fit lg:sticky lg:top-24">
        <h2 className="text-xl font-semibold">{editing ? "Edit plan" : "Create plan"}</h2>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Starter" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="For small coaching institutes" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Price (₹ / period)</Label>
            <Input type="number" min={0} value={form.priceInr} onChange={(e) => setForm({ ...form, priceInr: Number(e.target.value) || 0 })} />
          </div>
          <div className="space-y-2">
            <Label>Period</Label>
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value as PlanInput["period"] })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Platform commission (%)</Label>
          <Input type="number" min={0} max={100} value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) || 0 })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Max courses</Label><Input type="number" min={0} value={form.limits.maxCourses} onChange={(e) => setLimits("maxCourses", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Max students</Label><Input type="number" min={0} value={form.limits.maxStudents} onChange={(e) => setLimits("maxStudents", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Storage (GB)</Label><Input type="number" min={0} value={form.limits.storageGb} onChange={(e) => setLimits("storageGb", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Staff seats</Label><Input type="number" min={0} value={form.limits.staffSeats} onChange={(e) => setLimits("staffSeats", Number(e.target.value))} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: !!v })} />
          Published (visible in pricing)
        </label>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create plan"}</Button>
          {editing && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>}
        </div>
      </form>

      <div className="space-y-4">
        {plans.length === 0 && <p className="text-slate-600">No plans yet.</p>}
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-2xl font-bold text-slate-900">{formatPlanPrice(plan.priceInr, plan.period)}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {plan.limits?.maxCourses ?? 0} courses · {plan.limits?.maxStudents ?? 0} students ·{" "}
                  {plan.limits?.storageGb ?? 0} GB · {plan.limits?.staffSeats ?? 0} seats
                </p>
                <p className="text-sm text-slate-500">
                  {plan.commissionPct}% platform commission ·{" "}
                  <span className={plan.published ? "text-emerald-600" : "text-slate-400"}>
                    {plan.published ? "published" : "unpublished"}
                  </span>
                  {instituteCounts[plan.id] ? ` · ${instituteCounts[plan.id]} institute(s)` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(plan)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(plan)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}