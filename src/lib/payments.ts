import type { Timestamp } from "firebase/firestore";

import type { PaymentMethod } from "./types";

/**
 * Static payment configuration for the manual payment-verification flow.
 *
 * Each entry is one "QR spot" on the payment page (`/courses/[slug]/pay`):
 * the student picks a method, scans the QR, and submits the transaction
 * reference, which an admin verifies manually before approving access.
 *
 * - `qrSrc` points at files in /public. A missing file (e.g. the PayPal QR
 *   hasn't been provided yet) is handled in the UI with a graceful
 *   "QR coming soon — contact the admin" fallback panel via <img onError>.
 *   Drop the real QR at public/QR_Paypal_Payment.png and it appears with no
 *   code changes.
 * - Both QRs are STATIC images with no amount embedded, so the student must
 *   enter the amount manually in their payment app. The payment page always
 *   displays the exact amounts — INR from courses/{courseId}.price (UPI) and
 *   USD from courses/{courseId}.priceUsd (PayPal), both admin-set at course
 *   creation/edit — as "Amount to Pay".
 * - Replace the placeholder `payToNote` strings with the real UPI ID /
 *   PayPal handle once available.
 */
export const PAYMENT_METHODS: {
  method: PaymentMethod;
  label: string;
  qrSrc: string;
  payToNote: string;
}[] = [
  {
    method: "upi",
    label: "UPI",
    qrSrc: "/QR_Local_Payment.jpeg",
    payToNote: "Scan with any UPI app (GPay / PhonePe / Paytm) and pay the INR amount shown above.",
  },
  {
    method: "paypal",
    label: "PayPal",
    qrSrc: "/QR_Paypal_Payment.png",
    payToNote: "Pay the exact USD amount shown above — PayPal converts from your local currency.",
  },
];