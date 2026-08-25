/**
 * DruptoLMS order ledger (client-safe reads + pure money math).
 *
 * Orders are the platform's source-of-truth ledger for money movement.
 * Client code only ever READS orders here; creating/updating orders is
 * restricted to Cloud Functions (webhook / verifyPayment / refundOrder) and
 * enforced by Firestore rules (`allow write: if false`).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order, OrderStatus } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export async function getOrder(orderId: string): Promise<Order | null> {
  const ref = doc(db, "orders", orderId);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Order) : null;
}

export async function getOrdersForUser(userId: string): Promise<Order[]> {
  const q = query(
    collection(db, "orders"),
    where("buyerId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
}

export async function getOrdersForInstitute(instituteId: string): Promise<Order[]> {
  const q = query(
    collection(db, "orders"),
    where("instituteId", "==", instituteId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
}

export async function getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
  const q = query(
    collection(db, "orders"),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
}

export async function getAllOrders(): Promise<Order[]> {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
}

/**
 * Finds the single "blocking" course order for a buyer: either a paid order
 * (already enrolled) or an in-flight pending one (prevent duplicate checkout).
 * Uses a minimal (buyerId, courseId) query and filters in memory to avoid
 * a 4-field composite index.
 */
export async function getBlockingCourseOrder(
  buyerId: string,
  courseId: string
): Promise<Order | null> {
  const q = query(
    collection(db, "orders"),
    where("buyerId", "==", buyerId),
    where("courseId", "==", courseId)
  );
  const snapshot = await getDocs(q);
  const blocking = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Order)
    .filter((o) => o.status === "pending" || o.status === "paid")
    .sort((a, b) => ((b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)));
  return blocking[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Split math (paise).                                                        */
/* -------------------------------------------------------------------------- */

export interface OrderSplit {
  commission: number; // platform share, paise
  instituteShare: number; // net to institute, paise
}

/**
 * Splits a gross amount (paise) between platform commission and the
 * institute. CommissionPct is snapshotted on the order so later changes to a
 * plan never alter historical math.
 */
export function computeOrderSplit(amountPaise: number, commissionPct: number): OrderSplit {
  const safePct = Math.min(100, Math.max(0, commissionPct));
  const commission = Math.round((amountPaise * safePct) / 100);
  return {
    commission,
    instituteShare: amountPaise - commission,
  };
}

/* -------------------------------------------------------------------------- */
/* Aggregates                                                                 */
/* -------------------------------------------------------------------------- */

export interface OrderTotals {
  count: number;
  grossPaise: number;
  commissionPaise: number;
  instituteSharePaise: number;
  refundedPaise: number;
}

export function sumOrders(orders: Order[]): OrderTotals {
  const totals: OrderTotals = { count: 0, grossPaise: 0, commissionPaise: 0, instituteSharePaise: 0, refundedPaise: 0 };
  for (const order of orders) {
    if (order.status !== "paid" && order.status !== "refunded") continue;
    totals.count += 1;
    const gross = order.refund?.full ? 0 : order.amount;
    totals.grossPaise += gross;
    // Institute share is refunded proportionally as well for full refunds.
    totals.instituteSharePaise += order.refund?.full ? 0 : order.instituteShare;
    totals.commissionPaise += order.refund?.full ? 0 : order.commission;
    totals.refundedPaise += order.refund?.amount ?? 0;
  }
  return totals;
}

export async function getOrderCountForUser(userId: string): Promise<number> {
  const snapshot = await getCountFromServer(
    query(collection(db, "orders"), where("buyerId", "==", userId))
  );
  return snapshot.data().count;
}

export async function getOrderCountForInstitute(instituteId: string): Promise<number> {
  const snapshot = await getCountFromServer(
    query(collection(db, "orders"), where("instituteId", "==", instituteId))
  );
  return snapshot.data().count;
}

export async function getTotalOrders(): Promise<number> {
  const snapshot = await getCountFromServer(collection(db, "orders"));
  return snapshot.data().count;
}