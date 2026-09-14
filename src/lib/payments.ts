import type { Timestamp } from "firebase/firestore";

import type { PaymentMethod } from "./types";

/**
 * Static payment configuration for the manual payment-verification flow.
 *
 * CURRENT MODE: INR-only via UPI (KOTAK). PayPal is HIDDEN for now — its
 * config entry is kept below but excluded from the active list (see
 * PAYPAL_ENABLED) so it can be re-enabled later with no data migration.
 *
 * Each entry is one "QR spot" on the payment page (`/courses/[slug]/pay`):
 * the student picks a method, scans the QR, and submits the transaction
 * reference, which an admin verifies manually before approving access.
 *
 * - `qrSrc` points at files in /public. A missing file is handled in the UI
 *   with a graceful "QR coming soon — contact the admin" fallback panel via
 *   <Image onError>.
 * - The UPI QR is a STATIC image with no amount embedded, so the student must
 *   enter the amount manually in their payment app. The payment page always
 *   displays the exact amount — INR from courses/{courseId}.price — as
 *   "Amount to Pay".
 * - Replace the placeholder `payToNote` string with the real KOTAK UPI ID
 *   once available.
 */

/**
 * Set to `true` to re-enable the PayPal rail (USD via PayPal QR).
 * When `false`, only UPI is offered and all USD/PayPal UI stays hidden.
 */
export const PAYPAL_ENABLED = false;

const UPI_OPTION = {
  method: "upi" as PaymentMethod,
  label: "UPI",
  qrSrc: "/QR_Local_Payment.jpeg",
  payToNote:
    "Scan with any UPI app (GPay / PhonePe / Paytm / KOTAK) and pay the INR amount shown above to the KOTAK UPI account.",
};

// PayPal rail (hidden for now — set PAYPAL_ENABLED = true to re-enable).
// Kept out of the default list so no PayPal UI renders while INR/UPI-only
// mode is active. Legacy enrollments with method "paypal" still display.
const PAYPAL_OPTION = {
  method: "paypal" as PaymentMethod,
  label: "PayPal",
  qrSrc: "/QR_Paypal_Payment.png",
  payToNote:
    "Pay the exact USD amount shown above — PayPal converts from your local currency.",
};

export const PAYMENT_METHODS: {
  method: PaymentMethod;
  label: string;
  qrSrc: string;
  payToNote: string;
}[] = PAYPAL_ENABLED ? [UPI_OPTION, PAYPAL_OPTION] : [UPI_OPTION];