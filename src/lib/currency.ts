import type { Course } from "./types";

/**
 * INR formatting for the payment flow: all payments are INR via the UPI
 * (KOTAK) QR. The per-course price lives in courses/{courseId}.price —
 * there is no automatic FX conversion, so manual payment verification always
 * has an exact expected amount.
 *
 * USD/PayPal helpers are kept for legacy data + easy re-enable, but no
 * USD price is shown while PayPal stays hidden (see PAYPAL_ENABLED in
 * src/lib/payments.ts).
 */
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Formats an INR amount: "₹5,000" / "₹5,000.50". */
export function formatInr(amount: number): string {
  return inrFormatter.format(amount);
}

/** Formats a USD amount: "$60" / "$59.99". */
export function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}

/**
 * Compact price string for cards and chips — currently INR-only
 * ("₹5,000") while PayPal/USD is hidden. The USD suffix is intentionally
 * suppressed even when a course has a legacy priceUsd configured; set
 * PAYPAL_ENABLED back to true and restore the dual suffix to re-enable.
 */
export function formatCoursePrice(
  course: Pick<Course, "price" | "priceUsd">
): string {
  return formatInr(course.price);
}