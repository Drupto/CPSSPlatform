/**
 * INR (₹) currency helpers.
 *
 * DruptoLMS stores all monetary values in **paise** (integers) to match
 * Razorpay's API and to avoid floating-point drift in split calculations
 * (commission, institute share, refunds).
 */

/** Convert paise → rupees (number, 2 decimals). */
export function paiseToRupees(paise: number): number {
  return Math.round((paise / 100) * 100) / 100;
}

/** Convert rupees → paise (integer, throws on fractional decimals). */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) {
    throw new Error(`Invalid rupee amount: ${rupees}`);
  }
  return Math.round(rupees * 100);
}

/**
 * Format a rupee amount (already in rupees) as `₹1,234` and,
 * when there is a paise component, `₹1,234.5`.
 */
export function formatINR(rupees: number): string {
  const value = Number.isFinite(rupees) ? rupees : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format a paise integer as `₹1,234` / `₹1,234.5`. */
export function formatINRPaise(paise: number): string {
  return formatINR(paiseToRupees(paise));
}

/**
 * Human friendly plan price: monthly amounts show `₹999/mo`,
 * annual amounts show `₹9,999/yr`.
 */
export function formatPlanPrice(priceInr: number, period: "monthly" | "annual"): string {
  return `${formatINR(priceInr)}/${period === "monthly" ? "mo" : "yr"}`;
}