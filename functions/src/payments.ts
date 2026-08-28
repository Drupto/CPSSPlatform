/**
 * DruptoLMS — Payment Cloud Functions (Razorpay).
 *
 * Owns the complete purchase lifecycle:
 * - `createCheckout`     : validates + creates a Razorpay Order + a pending `orders` doc
 * - `handleRazorpayWebhook`: verifies signature over the raw body -> idempotent grant
 * - `verifyPayment`       : client-side fallback when the webhook is delayed
 * - `refundOrder` / `revokeEnrollment`: admin refunds and access revocation
 * - `reconcilePendingOrders` / `expireInstitutes`: scheduled maintenance
 *
 * Orders live in `orders/{id}` (the ledger). They are created/updated ONLY from
 * these functions (Firestore rules deny all client writes — mirrors `quizAttempts`).
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import Razorpay = require("razorpay");
import { Timestamp } from "firebase-admin/firestore";

/* -------------------------------------------------------------------------- */
/* Types (mirroring src/lib/types.ts — kept local so the deploy boundary stays */
/* independent of the Next.js source tree).                                    */
/* -------------------------------------------------------------------------- */

export type OrderType = "course" | "plan";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderDoc {
  id: string;
  type: OrderType;
  buyerId: string;
  instituteId?: string;
  courseId?: string;
  planId?: string;
  amount: number; // paise (gross)
  commissionPct: number; // snapshot
  commission: number; // platform share (paise)
  instituteShare: number; // net to institute (paise)
  currency: string;
  status: OrderStatus;
  gatewayRef?: string;
  paymentId?: string;
  planPeriodMonths?: number;
  refund?: { id: string; amount: number; full: boolean; at: admin.firestore.Timestamp };
  createdAt: admin.firestore.Timestamp | null;
  paidAt?: admin.firestore.Timestamp | null;
  updatedAt: admin.firestore.Timestamp | null;
}

interface CourseLike {
  title?: string;
  price?: number;
  published?: boolean;
  instituteId?: string;
}

interface PlanLike {
  name: string;
  priceInr: number;
  period?: "monthly" | "annual";
  commissionPct?: number;
  limits?: Record<string, unknown>;
  published?: boolean;
}

interface InstituteLike {
  ownerUid: string;
  subscriptionStatus?: string;
  planExpiresAt?: admin.firestore.Timestamp | null;
}

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const PAYMENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/** Pending orders older than this are eligible for reconciliation. */
const ORDER_STALE_MS = 2 * 60 * 60 * 1000; // 2 hours
/** Grace period after plan expiry before an institute becomes "expired". */
const INSTITUTE_GRACE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function assertValidId(value: unknown, field: string): void {
  if (typeof value !== "string" || !ID_RE.test(value)) {
    throw new HttpsError("invalid-argument", `Invalid ${field}`);
  }
}

function assertPaymentId(value: unknown): void {
  if (typeof value !== "string" || !PAYMENT_ID_RE.test(value)) {
    throw new HttpsError("invalid-argument", "Invalid paymentId");
  }
}

/* -------------------------------------------------------------------------- */
/* Gateway config                                                              */
/* -------------------------------------------------------------------------- */

function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!keyId || !keySecret) {
    throw new HttpsError("failed-precondition", "Payment gateway is not configured");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

/* -------------------------------------------------------------------------- */
/* Money split (paise)                                                         */
/* -------------------------------------------------------------------------- */

function computeSplit(
  amountPaise: number,
  commissionPct: number
): { commission: number; instituteShare: number } {
  const safe = Math.min(100, Math.max(0, commissionPct));
  const commission = Math.round((amountPaise * safe) / 100);
  return { commission, instituteShare: amountPaise - commission };
}

/* -------------------------------------------------------------------------- */
/* Authorization helpers                                                       */
/* -------------------------------------------------------------------------- */

async function isSuperUser(db: admin.firestore.Firestore, uid: string): Promise<boolean> {
  const snap = await db.doc(`users/${uid}`).get();
  return snap.exists && snap.data()?.role === "super";
}

/** Owner or active staff member of the institute. */
async function canManageInstitute(
  db: admin.firestore.Firestore,
  uid: string,
  instituteId: string | undefined
): Promise<boolean> {
  if (!instituteId) return false;
  const instSnap = await db.doc(`institutes/${instituteId}`).get();
  if (instSnap.exists && instSnap.data()?.ownerUid === uid) return true;

  const memberSnap = await db.doc(`institutes/${instituteId}/members/${uid}`).get();
  if (!memberSnap.exists) return false;
  const member = memberSnap.data() as { role?: string; status?: string } | undefined;
  return member?.status === "active" && (member.role === "admin" || member.role === "staff");
}

/** Course must still be published and (if tenant-owned) the institute still active. */
async function assertCoursePurchasableNow(
  db: admin.firestore.Firestore,
  order: OrderDoc
): Promise<void> {
  const courseSnap = await db.doc(`courses/${order.courseId}`).get();
  if (!courseSnap.exists) {
    throw new HttpsError("failed-precondition", "Course is no longer available");
  }
  const course = courseSnap.data() as CourseLike | undefined;
  if (course?.published !== true) {
    throw new HttpsError("failed-precondition", "Course is no longer available for purchase");
  }
  if (course?.instituteId) {
    const instSnap = await db.doc(`institutes/${course.instituteId}`).get();
    const inst = instSnap.data() as InstituteLike | undefined;
    if (!inst || inst.subscriptionStatus !== "active") {
      throw new HttpsError("failed-precondition", "The institute selling this course is not active");
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Order lookup                                                                */
/* -------------------------------------------------------------------------- */

async function findOrderByGatewayRef(
  db: admin.firestore.Firestore,
  gatewayId: string
): Promise<{ id: string; data: OrderDoc } | null> {
  const snap = await db
    .collection("orders")
    .where("gatewayRef", "==", gatewayId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = { ...(doc.data() as OrderDoc), id: doc.id };
  return { id: doc.id, data };
}

/* -------------------------------------------------------------------------- */
/* Idempotent grant                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Marks an order `paid` and performs the associated grant in ONE transaction.
 * Because the status guard is (`pending -> paid` only) and enrollment IDs are
 * deterministic (`{buyerId}_{courseId}`), concurrent webhook + verifyPayment
 * calls can never double-grant or double-create enrollments.
 */
async function grantPaidOrder(
  db: admin.firestore.Firestore,
  orderId: string,
  paymentId: string
): Promise<OrderDoc> {
  let granted: OrderDoc;
  try {
    granted = await db.runTransaction(async (tx) => {
      const orderRef = db.doc(`orders/${orderId}`);
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        throw new HttpsError("not-found", "Order not found");
      }
      const order = { id: orderSnap.id, ...orderSnap.data() } as OrderDoc;

      if (order.status === "paid") {
        return order; // already granted (idempotent)
      }
      if (order.status !== "pending") {
        throw new HttpsError("failed-precondition", `Order is not payable (status: ${order.status})`);
      }

      const now = Timestamp.now();
      tx.update(orderRef, {
        status: "paid",
        paymentId,
        paidAt: now,
        updatedAt: now,
      });

      if (order.type === "course") {
        const buyerSnap = await tx.get(db.doc(`users/${order.buyerId}`));
        const buyer = buyerSnap.exists ? (buyerSnap.data() as { displayName?: string; email?: string } | undefined) : undefined;
        tx.set(
          db.doc(`enrollments/${order.buyerId}_${order.courseId}`),
          {
            id: `${order.buyerId}_${order.courseId}`,
            userId: order.buyerId,
            courseId: order.courseId,
            status: "approved",
            source: "order",
            orderId,
            requestedAt: order.createdAt ?? now,
            enrolledAt: now,
            // Denormalized buyer info so the institute can display students
            // without reading other users' profiles (blocked by rules).
            studentName: buyer?.displayName ?? "",
            studentEmail: buyer?.email ?? "",
          },
          { merge: true }
        );
      } else if (order.type === "plan" && order.instituteId) {
        const [planSnap, instSnap] = await Promise.all([
          tx.get(db.doc(`plans/${order.planId}`)),
          tx.get(db.doc(`institutes/${order.instituteId}`)),
        ]);
        const plan = planSnap.exists ? (planSnap.data() as PlanLike | undefined) : undefined;
        const instData = instSnap.exists
          ? (instSnap.data() as { planExpiresAt?: admin.firestore.Timestamp } | undefined)
          : undefined;

        const base = instData?.planExpiresAt ? new Date(instData.planExpiresAt.toMillis()) : new Date();
        if (base.getTime() <= Date.now()) base.setTime(Date.now());
        base.setMonth(base.getMonth() + (order.planPeriodMonths ?? 1));

        tx.update(db.doc(`institutes/${order.instituteId}`), {
          subscriptionStatus: "active",
          planId: order.planId,
          planExpiresAt: Timestamp.fromDate(base),
          activeOrderId: orderId,
          limits: plan?.limits ?? {},
          commissionPct: Number(plan?.commissionPct ?? 0),
          updatedAt: now,
        });
        tx.set(
          db.doc(`users/${order.buyerId}`),
          { role: "institute", instituteId: order.instituteId, updatedAt: now },
          { merge: true }
        );
      }

      return order;
    });
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error(`[grantPaidOrder] Failed for ${orderId}:`, err);
    throw new HttpsError("internal", "Failed to grant the order");
  }

  // Custom claims are set OUTSIDE the Firestore transaction (Auth API).
  if (granted.type === "plan" && granted.instituteId) {
    try {
      await admin.auth().setCustomUserClaims(granted.buyerId, {
        role: "institute",
        instituteId: granted.instituteId,
      });
    } catch (err) {
      console.error("[grantPaidOrder] Failed to set custom claims:", err);
    }
  }

  return granted;
}

/* -------------------------------------------------------------------------- */
/* createCheckout — onCall                                                     */
/* -------------------------------------------------------------------------- */

interface CreateCheckoutData {
  type: OrderType;
  courseId?: string;
  planId?: string;
}

export interface CreateCheckoutResult {
  orderDocId: string;
  type: OrderType;
  status: string;
  requiresPayment: boolean;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  amountPaise?: number;
  currency?: string;
  courseId?: string;
  planId?: string;
  instituteId?: string;
}

async function createCourseCheckout(
  db: admin.firestore.Firestore,
  uid: string,
  courseId: string
): Promise<CreateCheckoutResult> {
  const courseSnap = await db.doc(`courses/${courseId}`).get();
  if (!courseSnap.exists) {
    throw new HttpsError("not-found", "Course not found");
  }
  const course = courseSnap.data() as CourseLike | undefined;
  if (course?.published !== true) {
    throw new HttpsError("failed-precondition", "This course is not available for purchase");
  }

  let commissionPct = 100; // platform-owned courses: 100% platform
  const instituteId = course.instituteId;
  if (instituteId) {
    const instSnap = await db.doc(`institutes/${instituteId}`).get();
    const inst = instSnap.data() as (InstituteLike & { commissionPct?: number }) | undefined;
    if (!inst || inst.subscriptionStatus !== "active") {
      throw new HttpsError("failed-precondition", "The institute selling this course is not active");
    }
    const buyerSnap = await db.doc(`users/${uid}`).get();
    if (buyerSnap.data()?.instituteId === instituteId) {
      throw new HttpsError("permission-denied", "Institute members cannot purchase their own course");
    }
    commissionPct = Number(inst.commissionPct ?? 0);
  }

  const price = Number(course.price) || 0;
  if (price < 0) {
    throw new HttpsError("invalid-argument", "Invalid course price");
  }
  const amountPaise = Math.round(price * 100);

  // Duplicate / in-flight guard: only ONE pending or paid course order per buyer.
  const snapshot = await db
    .collection("orders")
    .where("buyerId", "==", uid)
    .where("courseId", "==", courseId)
    .limit(10)
    .get();
  const blocking = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as OrderDoc)
    .find((o) => o.status === "pending" || o.status === "paid");
  if (blocking) {
    if (blocking.status === "paid") {
      throw new HttpsError("already-exists", "You are already enrolled in this course");
    }
    return {
      orderDocId: blocking.id,
      type: "course",
      status: "pending",
      requiresPayment: true,
      razorpayOrderId: blocking.gatewayRef,
      razorpayKeyId: blocking.gatewayRef ? getRazorpayKeyId() : undefined,
      amountPaise: blocking.amount,
      currency: "INR",
      courseId,
      instituteId: blocking.instituteId,
    };
  }

  const now = Timestamp.now();
  const split = computeSplit(amountPaise, commissionPct);
  const orderRef = db.collection("orders").doc();
  const orderDocId = orderRef.id;

  const buyerSnap = await db.doc(`users/${uid}`).get();
  const buyer = buyerSnap.exists ? (buyerSnap.data() as { displayName?: string; email?: string } | undefined) : undefined;

  await orderRef.set({
    id: orderDocId,
    type: "course",
    buyerId: uid,
    buyerName: buyer?.displayName ?? "",
    buyerEmail: buyer?.email ?? "",
    instituteId: instituteId ?? undefined,
    courseId,
    amount: amountPaise,
    commissionPct,
    commission: split.commission,
    instituteShare: split.instituteShare,
    currency: "INR",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  // Free courses skip the gateway entirely and are granted immediately.
  if (amountPaise === 0) {
    await grantPaidOrder(db, orderDocId, `free_${orderDocId}`);
    return {
      orderDocId,
      type: "course",
      status: "paid",
      requiresPayment: false,
      amountPaise: 0,
      currency: "INR",
      courseId,
      instituteId,
    };
  }

  const rzp = getRazorpay();
  const rzpOrder = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `c_${orderDocId}`.slice(0, 40),
    notes: { orderDocId, type: "course" },
  });
  await orderRef.update({ gatewayRef: rzpOrder.id, updatedAt: Timestamp.now() });

  return {
    orderDocId,
    type: "course",
    status: "pending",
    requiresPayment: true,
    razorpayOrderId: rzpOrder.id,
    razorpayKeyId: getRazorpayKeyId(),
    amountPaise,
    currency: "INR",
    courseId,
    instituteId,
  };
}

async function createPlanCheckout(
  db: admin.firestore.Firestore,
  uid: string,
  planId: string
): Promise<CreateCheckoutResult> {
  const planSnap = await db.doc(`plans/${planId}`).get();
  if (!planSnap.exists) {
    throw new HttpsError("not-found", "Plan not found");
  }
  const plan = planSnap.data() as PlanLike | undefined;
  if (plan?.published !== true) {
    throw new HttpsError("failed-precondition", "This plan is not available");
  }

  const now = Timestamp.now();

  // Reuse the buyer's existing institute (any status) or create a pending one.
  let instituteId: string | null = null;
  const existingInsts = await db.collection("institutes").where("ownerUid", "==", uid).limit(1).get();
  if (!existingInsts.empty) {
    instituteId = existingInsts.docs[0].id;
  } else {
    const newInstRef = db.collection("institutes").doc();
    instituteId = newInstRef.id;
    await newInstRef.set({
      id: instituteId,
      slug: `inst_${instituteId}`,
      name: "My Institute",
      ownerUid: uid,
      planId,
      subscriptionStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
  }

  // Duplicate / in-flight guard for plan purchases.
  const inFlight = await db
    .collection("orders")
    .where("buyerId", "==", uid)
    .where("type", "==", "plan")
    .limit(10)
    .get();
  const blocking = inFlight.docs
    .map((d) => ({ id: d.id, ...d.data() }) as OrderDoc)
    .find((o) => o.status === "pending" || o.status === "paid");
  if (blocking) {
    if (blocking.status === "paid") {
      throw new HttpsError("already-exists", "You already have an active subscription");
    }
    return {
      orderDocId: blocking.id,
      type: "plan",
      status: "pending",
      requiresPayment: true,
      razorpayOrderId: blocking.gatewayRef,
      razorpayKeyId: blocking.gatewayRef ? getRazorpayKeyId() : undefined,
      amountPaise: blocking.amount,
      currency: "INR",
      planId,
      instituteId: blocking.instituteId,
    };
  }

  const priceInr = Number(plan.priceInr) || 0;
  const amountPaise = Math.round(priceInr * 100);
  const planPeriodMonths = plan.period === "annual" ? 12 : 1;

  // Plan purchases are 100% platform revenue (no institute share).
  const orderRef = db.collection("orders").doc();
  const orderDocId = orderRef.id;
  await orderRef.set({
    id: orderDocId,
    type: "plan",
    buyerId: uid,
    instituteId,
    planId,
    amount: amountPaise,
    commissionPct: 100,
    commission: amountPaise,
    instituteShare: 0,
    currency: "INR",
    status: "pending",
    planPeriodMonths,
    createdAt: now,
    updatedAt: now,
  });

  const rzp = getRazorpay();
  const rzpOrder = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `p_${orderDocId}`.slice(0, 40),
    notes: { orderDocId, type: "plan" },
  });
  await orderRef.update({ gatewayRef: rzpOrder.id, updatedAt: Timestamp.now() });

  return {
    orderDocId,
    type: "plan",
    status: "pending",
    requiresPayment: true,
    razorpayOrderId: rzpOrder.id,
    razorpayKeyId: getRazorpayKeyId(),
    amountPaise,
    currency: "INR",
    planId,
    instituteId,
  };
}

export const createCheckout = onCall<CreateCheckoutData, Promise<CreateCheckoutResult>>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in to continue");
    }
    const data = request.data ?? {};
    if (data.type === "course") {
      assertValidId(data.courseId, "courseId");
      return createCourseCheckout(admin.firestore(), uid, data.courseId as string);
    }
    if (data.type === "plan") {
      assertValidId(data.planId, "planId");
      return createPlanCheckout(admin.firestore(), uid, data.planId as string);
    }
    throw new HttpsError("invalid-argument", "type must be 'course' or 'plan'");
  }
);

/* -------------------------------------------------------------------------- */
/* Webhook — events from Razorpay                                             */
/* -------------------------------------------------------------------------- */

function logRejectedEvent(
  db: admin.firestore.Firestore,
  event: string,
  gatewayId: string,
  payload: Record<string, unknown>,
  reason: string
): Promise<admin.firestore.DocumentReference<admin.firestore.DocumentData>> {
  return db.collection("rejectedEvents").add({
    event,
    gatewayId,
    reason,
    payload,
    at: Timestamp.now(),
  });
}

export interface VerifyPaymentData {
  orderDocId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const handleRazorpayWebhook = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
    if (!secret) {
      res.status(500).json({ error: "Webhook not configured" });
      return;
    }
    const headerSignature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody?.toString() ?? "";
    if (
      typeof headerSignature !== "string" ||
      !Razorpay.validateWebhookSignature(rawBody, headerSignature, secret)
    ) {
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody) as Record<string, any>;
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }

    const event = String(payload.event ?? "");
    const entity = (payload.payload?.payment?.entity ?? payload.entity) as Record<string, any> | undefined;
    const gatewayId = entity?.order_id as string | undefined;

    if (!gatewayId) {
      // Not a payment event we care about — acknowledge to stop retries.
      res.status(200).json({ received: true, event });
      return;
    }

    const db = admin.firestore();
    try {
      if (event === "payment.captured") {
        const hit = await findOrderByGatewayRef(db, gatewayId);
        if (!hit) {
          await logRejectedEvent(db, event, gatewayId, payload, "unmatched order");
          res.status(200).json({ received: true, status: "unmatched" });
          return;
        }

        const capturedAmount = Number(entity?.amount) || 0;
        if (capturedAmount !== hit.data.amount) {
          await logRejectedEvent(db, event, gatewayId, payload, `amount mismatch expected=${hit.data.amount} got=${capturedAmount}`);
          res.status(200).json({ received: true, status: "amount-mismatch" });
          return;
        }

        try {
          if (hit.data.type === "course") {
            await assertCoursePurchasableNow(db, hit.data);
          }
          const granted = await grantPaidOrder(db, hit.id, String(entity?.id ?? ""));
          res.status(200).json({ received: true, status: "granted", orderDocId: hit.id, type: granted.type });
        } catch (err) {
          if (err instanceof HttpsError) {
            // Deterministic business rule (e.g. course unpublished) — unsure refundable
            await logRejectedEvent(db, event,gatewayId, payload, err.message);
            res.status(200).json({ received: true, status: "rejected" });
          } else {
            throw err; // transient — let Razorpay retry
          }
        }
      } else if (event === "payment.failed") {
        const hit = await findOrderByGatewayRef(db, gatewayId);
        if (hit && hit.data.status === "pending") {
          await db.doc(`orders/${hit.id}`).update({ status: "failed", updatedAt: Timestamp.now() });
        }
        res.status(200).json({ received: true, status: "failed" });
      } else {
        res.status(200).json({ received: true, event });
      }
    } catch (err) {
      console.error("[handleRazorpayWebhook]", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* verifyPayment — client-side fallback for the checkout success redirect     */
/* -------------------------------------------------------------------------- */

export const verifyPayment = onCall<VerifyPaymentData, Promise<{ success: boolean; orderDocId: string; paymentId: string }>>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in to continue");
    }
    const data = request.data ?? {};
    assertValidId(data.orderDocId, "orderDocId");
    assertPaymentId(data.razorpayPaymentId);

    const db = admin.firestore();
    const orderSnap = await db.doc(`orders/${data.orderDocId}`).get();
    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order not found");
    }
    const order = { id: orderSnap.id, ...orderSnap.data() } as OrderDoc;

    if (order.buyerId !== uid) {
      throw new HttpsError("permission-denied", "You cannot verify this order");
    }
    if (order.status === "paid") {
      return { success: true, orderDocId: order.id, paymentId: order.paymentId ?? data.razorpayPaymentId };
    }
    if (order.status !== "pending") {
      throw new HttpsError("failed-precondition", "This order is not payable");
    }

    const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
    const gatewayRef = order.gatewayRef;
    if (!gatewayRef || !secret) {
      throw new HttpsError("failed-precondition", "Payment cannot be verified");
    }

    // Checkout success signature: HMAC-SHA256(secret, `${orderId}|${paymentId}`)
    const signatureValid = Razorpay.validateWebhookSignature(
      `${gatewayRef}|${data.razorpayPaymentId}`,
      data.razorpaySignature,
      secret
    );
    if (!signatureValid) {
      throw new HttpsError("unauthenticated", "Payment signature is invalid");
    }

    const rzp = getRazorpay();
    const payment = await rzp.payments.fetch(data.razorpayPaymentId);
    if (
      payment.order_id !== gatewayRef ||
      payment.status !== "captured" ||
      Number(payment.amount) !== order.amount
    ) {
      throw new HttpsError("failed-precondition", "Payment verification failed");
    }

    if (order.type === "course") {
      await assertCoursePurchasableNow(db, order);
    }

    await grantPaidOrder(db, order.id, data.razorpayPaymentId);
    return { success: true, orderDocId: order.id, paymentId: data.razorpayPaymentId };
  }
);

/* -------------------------------------------------------------------------- */
/* refundOrder — super / institute admin                                      */
/* -------------------------------------------------------------------------- */

interface RefundOrderData {
  orderDocId: string;
  full?: boolean;
  amountPaise?: number;
}

export const refundOrder = onCall<RefundOrderData, Promise<{ refundId: string; amountPaise: number; status: string }>>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in to continue");
    }
    const data = request.data ?? {};
    assertValidId(data.orderDocId, "orderDocId");

    const db = admin.firestore();
    const orderRef = db.doc(`orders/${data.orderDocId}`);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order not found");
    }
    const order = { id: orderSnap.id, ...orderSnap.data() } as OrderDoc;

    if (order.status !== "paid") {
      throw new HttpsError("failed-precondition", "Only paid orders can be refunded");
    }
    if (order.refund) {
      throw new HttpsError("already-exists", "This order has already been refunded");
    }
    if (!order.paymentId) {
      throw new HttpsError("failed-precondition", "Order has no payment reference");
    }

    // Authorization: plan refunds are super-only; course refunds are super or institute admin.
    if (order.type === "plan") {
      if (!(await isSuperUser(db, uid))) {
        throw new HttpsError("permission-denied", "Only the platform owner can refund plan purchases");
      }
    } else {
      const courseSnap = await db.doc(`courses/${order.courseId}`).get();
      const course = courseSnap.exists
        ? (courseSnap.data() as { instituteId?: string } | undefined)
        : undefined;
      const allowed =
        (await isSuperUser(db, uid)) || (await canManageInstitute(db, uid, course?.instituteId));
      if (!allowed) {
        throw new HttpsError("permission-denied", "You cannot refund this order");
      }
    }

    const refundAmount =
      data.full || !data.amountPaise ? order.amount : Math.min(Math.max(1, Math.round(data.amountPaise)), order.amount);

    const rzp = getRazorpay();
    const refund = await rzp.payments.refund(order.paymentId, { amount: refundAmount });

    const fullRefund = refundAmount >= order.amount;
    const now = Timestamp.now();
    await orderRef.update({
      status: fullRefund ? "refunded" : "paid",
      refund: { id: refund.id, amount: refundAmount, full: fullRefund, at: now },
      updatedAt: now,
    });

    // Full refund of a course revokes the student's access.
    if (fullRefund && order.type === "course" && order.courseId) {
      await db
        .doc(`enrollments/${order.buyerId}_${order.courseId}`)
        .update({ status: "revoked", revokedAt: now })
        .catch(() => console.warn(`[refundOrder] could not revoke enrollment for ${order.id}`));
    }

    return {
      refundId: refund.id,
      amountPaise: refundAmount,
      status: fullRefund ? "refunded" : "partial_refund",
    };
  }
);

/* -------------------------------------------------------------------------- */
/* revokeEnrollment — super / institute admin                                 */
/* -------------------------------------------------------------------------- */

interface RevokeEnrollmentData {
  userId: string;
  courseId: string;
}

export const revokeEnrollment = onCall<RevokeEnrollmentData, Promise<{ success: boolean }>>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in to continue");
    }
    const data = request.data ?? {};
    assertValidId(data.userId, "userId");
    assertValidId(data.courseId, "courseId");

    const db = admin.firestore();
    const courseSnap = await db.doc(`courses/${data.courseId}`).get();
    const course = courseSnap.exists
      ? (courseSnap.data() as { instituteId?: string } | undefined)
      : undefined;
    const allowed =
      (await isSuperUser(db, uid)) || (await canManageInstitute(db, uid, course?.instituteId));
    if (!allowed) {
      throw new HttpsError("permission-denied", "You cannot revoke this enrollment");
    }

    const now = Timestamp.now();
    await db
      .doc(`enrollments/${data.userId}_${data.courseId}`)
      .set({ status: "revoked", revokedAt: now }, { merge: true });
    return { success: true };
  }
);

/* -------------------------------------------------------------------------- */
/* syncUserClaims — refresh custom claims after role changes                  */
/* -------------------------------------------------------------------------- */

export const syncUserClaims = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in to continue");
  const db = admin.firestore();
  const profileSnap = await db.doc(`users/${uid}`).get();
  const data: Record<string, unknown> = profileSnap.data() ?? {};
  const claims: Record<string, unknown> = { role: data.role ?? "student" };
  if (data.instituteId) claims.instituteId = data.instituteId;
  await admin.auth().setCustomUserClaims(uid, claims);
  return { success: true };
});

/* -------------------------------------------------------------------------- */
/* reconcilePendingOrders — scheduled maintenance                              */
/* -------------------------------------------------------------------------- */

async function reconcileStaleOrder(db: admin.firestore.Firestore, doc: admin.firestore.QueryDocumentSnapshot): Promise<void> {
  const order = { id: doc.id, ...doc.data() } as OrderDoc;
  if (order.status !== "pending") return;

  // If a Razorpay order exists, check whether it was actually paid.
  if (order.gatewayRef) {
    const rzp = getRazorpay();
    let paidPaymentId: string | null = null;
    try {
      const payments = await rzp.orders.fetchPayments(order.gatewayRef);
      const captured = (payments.items ?? []).find(
        (p: { status?: string; captured?: boolean }) => p.status === "captured" && !!p.captured
      );
      if (captured) paidPaymentId = captured.id;
    } catch (err) {
      console.error(`[reconcilePendingOrders] gateway check failed for ${order.id}`, err);
      await db.doc(`orders/${order.id}`).update({ status: "failed", updatedAt: Timestamp.now() });
      return;
    }
    if (paidPaymentId) {
      await grantPaidOrder(db, order.id, paidPaymentId);
      return;
    }
  }

  // No paid payment -> mark failed so the buyer can start a fresh checkout.
  await db.doc(`orders/${order.id}`).update({ status: "failed", updatedAt: Timestamp.now() });
}

export const reconcilePendingOrders = onSchedule(
  { schedule: "5 * * * *", timeZone: "UTC" },
  async () => {
    const db = admin.firestore();
    const cutoff = Timestamp.fromMillis(Date.now() - ORDER_STALE_MS);
    const snapshot = await db
      .collection("orders")
      .where("status", "==", "pending")
      .orderBy("createdAt", "asc")
      .limit(50)
      .get();

    for (const doc of snapshot.docs) {
      const createdAtMs: number | undefined = doc.data().createdAt?.toMillis?.();
      if (createdAtMs !== undefined && createdAtMs > cutoff.toMillis()) break;
      try {
        await reconcileStaleOrder(db, doc);
      } catch (err) {
        console.error(`[reconcilePendingOrders] order ${doc.id} failed`, err);
      }
    }
    console.info(`[reconcilePendingOrders] checked ${snapshot.docs.length} orders`);
  }
);

/* -------------------------------------------------------------------------- */
/* expireInstitutes — scheduled lifecycle                                     */
/* -------------------------------------------------------------------------- */

export const expireInstitutes = onSchedule(
  { schedule: "0 2 * * *", timeZone: "UTC" },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const snapshot = await db
      .collection("institutes")
      .where("subscriptionStatus", "==", "active")
      .get();

    let updated = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data() as { planExpiresAt?: admin.firestore.Timestamp };
      const expiresMs = data.planExpiresAt?.toMillis?.();
      if (!expiresMs || expiresMs > now) continue;

      const staleFor = now - expiresMs;
      const status = staleFor > INSTITUTE_GRACE_MS ? "expired" : "suspended";
      await doc.ref.update({ subscriptionStatus: status, updatedAt: Timestamp.now() });
      updated += 1;
      console.info(`[expireInstitutes] ${doc.id} -> ${status}`);
    }
    console.info(`[expireInstitutes] processed ${updated} institutes`);
  }
);

/* -------------------------------------------------------------------------- */
/* onInstituteDelete — cascade to course archive                              */
/* -------------------------------------------------------------------------- */

export const onInstituteDelete = onDocumentDeleted(
  {
    document: "institutes/{instituteId}",
    retry: true,
  },
  async (event) => {
    const instituteId = event.params.instituteId;
    const db = admin.firestore();
    const courses = await db
      .collection("courses")
      .where("instituteId", "==", instituteId)
      .get();
    if (courses.empty) return;

    const batch = db.batch();
    const now = Timestamp.now();
    courses.docs.forEach((doc) => {
      batch.update(doc.ref, { archived: true, published: false, updatedAt: now });
    });
    await batch.commit();
    console.info(`[onInstituteDelete] archived ${courses.size} courses for ${instituteId}`);
  }
);