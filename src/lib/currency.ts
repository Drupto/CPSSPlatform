import type { Course } from "./types";

/**
 * Dual-currency formatting for the payment flow: INR is paid via the UPI QR,
 * USD via the PayPal QR. Both prices are admin-set per course
 * (courses/{courseId}.price and .priceUsd) — there is no automatic FX
 * conversion, so manual payment verification always has an exact expected
 * amount per rail.
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
 * Compact dual-currency price string for cards and chips: "₹5,000 · $60".
 * Falls back to INR-only when the course has no USD price configured.
 */
export function formatCoursePrice(
  course: Pick<Course, "price" | "priceUsd">
): string {
  const inr = formatInr(course.price);
  return course.priceUsd != null
    ? `${inr} · ${formatUsd(course.priceUsd)}`
    : inr;
}