/**
 * Client-side checkout flow for DruptoLMS course purchases (Razorpay).
 *
 * Flow:
 *  1. call `createCheckout` (Cloud Function) -> returns order + Razorpay order id
 *  2. if `requiresPayment` -> open the Razorpay checkout (checkout.js)
 *  3. on payment success -> call `verifyPayment` (Cloud Function) which
 *     idempotently marks the order paid and auto-creates the enrollment
 *  4. refresh the page/enrollment state
 *
 * Razorpay's Inline Checkout JS is loaded on demand from
 * https://checkout.razorpay.com/v1/checkout.js (the standard client SDK;
 * there is no npm package for the checkout modal — the global `Razorpay`
 * object is provided by that script).
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/* -------------------------------------------------------------------------- */
/* Types (mirror the Cloud Function response)                                 */
/* -------------------------------------------------------------------------- */

export interface CreateCheckoutResult {
  orderDocId: string;
  type: "course" | "plan";
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

export interface VerifyPaymentResult {
  success: boolean;
  orderDocId: string;
  paymentId: string;
}

/** Razorpay checkout success handler payload. */
export interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** Options contract for the Razorpay checkout.js constructor. */
export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { email?: string; name?: string };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

/* -------------------------------------------------------------------------- */
/* Cloud-function wrappers                                                     */
/* -------------------------------------------------------------------------- */

export async function createCourseCheckout(courseId: string): Promise<CreateCheckoutResult> {
  const fn = httpsCallable<{ type: "course"; courseId: string }, CreateCheckoutResult>(
    functions,
    "createCheckout"
  );
  const res = await fn({ type: "course", courseId });
  return res.data;
}

export async function verifyCheckoutPayment(input: {
  orderDocId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<VerifyPaymentResult> {
  const fn = httpsCallable<typeof input, VerifyPaymentResult>(functions, "verifyPayment");
  const res = await fn(input);
  return res.data;
}

/* -------------------------------------------------------------------------- */
/* Razorpay inline checkout                                                    */
/* -------------------------------------------------------------------------- */

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<NonNullable<Window["Razorpay"]>> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay checkout is browser-only"));
      return;
    }
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay failed to load"))));
      existing.addEventListener("error", () => reject(new Error("Razorpay failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay failed to load")));
    script.onerror = () => reject(new Error("Razorpay failed to load"));
    document.body.appendChild(script);
  });
}

export interface OpenCheckoutOptions {
  orderDocId: string;
  razorpayOrderId: string;
  keyId: string;
  amountPaise: number;
  currency: string;
  description: string;
  prefillEmail?: string;
  prefillName?: string;
  onSuccess: (response: RazorpayCheckoutResponse) => void | Promise<void>;
  onError: (error: string) => void;
}

/**
 * Opens the Razorpay modal. Calls `onSuccess` with the payment+signature once
 * the buyer completes payment; the caller should then call `verifyCheckoutPayment`
 * to finalize the enrollment.
 */
export async function openRazorpayCheckout(options: OpenCheckoutOptions): Promise<void> {
  const Razorpay = await loadRazorpayScript();

  const rzp = new Razorpay({
    key: options.keyId,
    amount: options.amountPaise,
    currency: options.currency,
    order_id: options.razorpayOrderId,
    name: "DruptoLMS",
    description: options.description,
    prefill: {
      email: options.prefillEmail ?? "",
      name: options.prefillName ?? "",
    },
    handler: (response) => {
      void options.onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        // User closed the modal without paying — leave the order pending.
      },
    },
    theme: {
      color: "#0f172a",
    },
  });

  rzp.open();
}