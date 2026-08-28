/**
 * Super-admin data access for DruptoLMS (`/super`).
 *
 * Client-side reads + writes that the Firestore rules explicitly allow for
 * `role === 'super'` (plans, institutes, payouts). Money mutations that must
 * go through the trusted ledger (refunds) are delegated to Cloud Functions
 * via `httpsCallable`.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type {
  Institute,
  Payout,
  PayoutStatus,
  SubscriptionStatus,
  Plan,
  PlanLimits,
  PlanPeriod,
  Order,
  OrderStatus,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Plans                                                                      */
/* -------------------------------------------------------------------------- */

export interface PlanInput {
  name: string;
  priceInr: number;
  period: PlanPeriod;
  commissionPct: number;
  limits: PlanLimits;
  published: boolean;
  description?: string;
}

export function planToInput(plan: Plan): PlanInput {
  return {
    name: plan.name,
    description: plan.description,
    priceInr: plan.priceInr,
    period: plan.period,
    commissionPct: plan.commissionPct,
    limits: plan.limits ?? { maxCourses: 0, maxStudents: 0, storageGb: 0, staffSeats: 0 },
    published: plan.published,
  };
}

export async function createPlan(input: PlanInput): Promise<void> {
  await addDoc(collection(db, "plans"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePlan(planId: string, input: PlanInput): Promise<void> {
  await setDoc(
    doc(db, "plans", planId),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deletePlan(planId: string): Promise<void> {
  await deleteDoc(doc(db, "plans", planId));
}

/* -------------------------------------------------------------------------- */
/* Institutes                                                                 */
/* -------------------------------------------------------------------------- */

export async function setInstituteStatus(
  instituteId: string,
  status: SubscriptionStatus,
  reason?: string
): Promise<void> {
  await updateDoc(doc(db, "institutes", instituteId), {
    subscriptionStatus: status,
    ...(reason ? { statusNote: reason } : {}),
    updatedAt: serverTimestamp(),
  });
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

export async function getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
  const q = query(collection(db, "orders"), where("status", "==", status), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
}

/** Super-initiated refund via the trusted `refundOrder` cloud function. */
export async function refundOrder(orderDocId: string, full: boolean, amountPaise?: number) {
  const fn = httpsCallable<{ orderDocId: string; full: boolean; amountPaise?: number }, { refundId: string; amountPaise: number; status: string }>(
    functions,
    "refundOrder"
  );
  const res = await fn({ orderDocId, full, amountPaise });
  return res.data;
}

/* -------------------------------------------------------------------------- */
/* Payouts                                                                     */
/* -------------------------------------------------------------------------- */

export type PayoutRow = Payout;

export async function getPayouts(): Promise<Payout[]> {
  const q = query(collection(db, "payouts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Payout);
}

/** Mark a payout settled (records an external reference). */
export async function markPayoutPaid(payoutId: string, reference?: string): Promise<void> {
  await updateDoc(doc(db, "payouts", payoutId), {
    status: "paid",
    ...(reference ? { reference } : {}),
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}