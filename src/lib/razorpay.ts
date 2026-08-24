/**
 * Server-only Razorpay client for DruptoLMS.
 *
 * ⚠️ NEVER import this module from a client component. It reads secret env
 * vars (`RAZORPAY_KEY_SECRET`) and uses Node `crypto`/`fetch`. Use it from
 * Next.js server code (API routes / server actions / generateMetadata) or
 * Cloud Functions. The Cloud Functions package keeps its own copy in
 * `functions/src/payments.ts` so the two deploy boundaries stay isolated.
 */
import * as crypto from "crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export function getRazorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return { keyId, keySecret };
}

export function razorpayIsConfigured(): boolean {
  const { keyId, keySecret } = getRazorpayKeys();
  return Boolean(keyId && keySecret);
}

/** Public key id (safe to send to the client for checkout JS init). */
export function getRazorpayKeyId(): string {
  return getRazorpayKeys().keyId;
}

export interface RazorpayOrderData {
  id: string;
  amount: number; // paise
  amount_paid: number; // paise
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
}

export interface CreateRazorpayOrderInput {
  amountPaise: number;
  currency?: string; // default "INR"
  receipt: string; // max 40 chars, e.g. `course_<uid>_<courseId>`
  notes?: Record<string, string>;
}

async function razorpayFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { keyId, keySecret } = getRazorpayKeys();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(init.headers ?? {}),
    },
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Razorpay API ${res.status}: ${body}`);
  }
  return JSON.parse(body) as T;
}

/**
 * Creates a Razorpay Order (the first leg of the checkout). Note: Razorpay's
 * REST API accepts form-encoded request bodies; we match that contract.
 */
export async function createRazorpayOrder(
  input: CreateRazorpayOrderInput
): Promise<RazorpayOrderData> {
  const body = new URLSearchParams();
  body.set("amount", String(input.amountPaise));
  body.set("currency", input.currency ?? "INR");
  body.set("receipt", input.receipt.slice(0, 40));
  if (input.notes) {
    for (const [key, value] of Object.entries(input.notes)) {
      body.set(`notes[${key}]`, value);
    }
  }

  const order = await razorpayFetch<RazorpayOrderData>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!order?.id || order.status !== "created") {
    throw new Error(`Unexpected Razorpay order response: ${JSON.stringify(order ?? null)}`);
  }
  return order;
}

export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrderData> {
  return razorpayFetch<RazorpayOrderData>(`/orders/${orderId}`);
}

export interface RazorpayPaymentData {
  id: string;
  order_id: string;
  amount: number; // paise
  currency: string;
  status: string; // captured | failed | ...
  captured: boolean;
  method?: string;
  created_at: number;
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPaymentData> {
  return razorpayFetch<RazorpayPaymentData>(`/payments/${paymentId}`);
}

export interface RefundRazorpayPaymentInput {
  paymentId: string;
  amountPaise: number;
  notes?: string;
}

export interface RazorpayRefundData {
  id: string;
  payment_id: string;
  amount: number; // paise
  status: string;
  created_at: number;
}

/** Issues a (possibly partial) refund against a captured Razorpay payment. */
export async function refundRazorpayPayment(
  input: RefundRazorpayPaymentInput
): Promise<RazorpayRefundData> {
  const body = new URLSearchParams();
  body.set("amount", String(input.amountPaise));
  if (input.notes) body.set("notes", input.notes);

  const refund = await razorpayFetch<RazorpayRefundData>(`/payments/${input.paymentId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!refund?.id) {
    throw new Error(`Unexpected Razorpay refund response: ${JSON.stringify(refund ?? null)}`);
  }
  return refund;
}

/* -------------------------------------------------------------------------- */
/* Signature verification                                                     */
/* -------------------------------------------------------------------------- */

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a Razorpay webhook signature (header `X-Razorpay-Signature`)
 * against the RAW request body. `timingSafeEqual` avoids timing attacks.
 */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!rawBody || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return safeEqualHex(expected, signature);
}

/**
 * Verifies the client-side checkout success payload signature:
 * HMAC-SHA256(secret, `${orderId}|${paymentId}`).
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const { orderId, paymentId, signature, secret } = params;
  if (!orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`, "utf8")
    .digest("hex");
  return safeEqualHex(expected, signature);
}