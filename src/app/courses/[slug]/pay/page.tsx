"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getPublishedCourseBySlug, getEnrollment, submitPaymentRequest } from "@/lib/course";
import { PAYMENT_METHODS } from "@/lib/payments";
import { formatInr, formatUsd } from "@/lib/currency";
import { isProfileComplete } from "@/lib/profile-check";
import type { Course, Enrollment, PaymentMethod } from "@/lib/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// Keep in sync with firestore.rules (paymentReference.size() bounds).
const REFERENCE_MIN_LENGTH = 4;
const REFERENCE_MAX_LENGTH = 100;

/**
 * Manual payment page — the required step between "Request Access" and admin
 * approval. Shows the course price (set at course creation), two QR spots
 * (UPI + PayPal), and collects the transaction reference. The submitted
 * details land on the enrollment document for the admin to verify manually
 * in /admin/enrollments.
 */
export default function CoursePaymentPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("upi");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState<Record<string, boolean>>({});

  // Published-only fetch (rules-v2-compliant for students/anonymous visitors).
  useEffect(() => {
    if (!slug) return;
    getPublishedCourseBySlug(slug as string)
      .then(setCourse)
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }
      setUser(currentUser);

      // Same profile-completeness gate as every other gated page.
      const isComplete = await isProfileComplete(currentUser);
      if (!isComplete && !window.location.pathname.startsWith("/dashboard/profile")) {
        router.push("/dashboard/profile");
        return;
      }

      if (course) {
        const existing = await getEnrollment(currentUser.uid, course.id);
        setEnrollment(existing);
        // Already-approved users don't belong on the payment page.
        if (existing?.status === "approved") {
          router.replace(`/courses/${course.slug}/learn`);
        }
      }
    });

    return () => unsubscribe();
  }, [course, router]);

  const paymentSubmitted = Boolean(
    enrollment && enrollment.status === "pending" && enrollment.paymentReference
  );
  const isRejected = enrollment?.status === "rejected";
  const isPendingWithoutPayment = Boolean(
    enrollment && enrollment.status === "pending" && !enrollment.paymentReference
  );
  const selectedOption = PAYMENT_METHODS.find((o) => o.method === selectedMethod) ?? PAYMENT_METHODS[0];

  const handleSubmit = async () => {
    setFormError(null);

    if (!user || !course) {
      router.push("/auth");
      return;
    }
    if (enrollment?.status === "approved") {
      router.replace(`/courses/${course.slug}/learn`);
      return;
    }

    const trimmedReference = reference.trim();
    if (trimmedReference.length < REFERENCE_MIN_LENGTH) {
      setFormError(
        `Please enter the transaction reference (at least ${REFERENCE_MIN_LENGTH} characters).`
      );
      return;
    }
    if (trimmedReference.length > REFERENCE_MAX_LENGTH) {
      setFormError(
        `The transaction reference must be at most ${REFERENCE_MAX_LENGTH} characters.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await submitPaymentRequest(user.uid, course.id, {
        method: selectedMethod,
        reference: trimmedReference,
      });
      toast({
        title: "Payment details submitted",
        description: "The admin will verify your payment and grant access shortly.",
      });
      router.push("/dashboard/my-courses");
    } catch (error) {
      console.error("Error submitting payment details:", error);
      setFormError("Could not submit your payment details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg text-slate-600">Loading payment details...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <main className="relative min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-28 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Course not found</h1>
          <p className="mt-4 text-slate-600">This course may have been removed or the link is invalid.</p>
          <Button className="mt-8" onClick={() => router.push("/courses")}>Back to Courses</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-28">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-secondary">Complete Enrollment</p>
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{course.title}</h1>
            <p className="text-slate-600">{course.description}</p>
          </div>

          {/* Amounts to pay — INR (courses.price) for UPI and USD
              (courses.priceUsd) for PayPal, both admin-set at course
              creation/edit. The QRs are static images with no amount embedded,
              so the student must enter the exact amount manually in their
              payment app. The selected method's currency is the primary
              amount. */}
          <div className="mt-8 rounded-3xl bg-slate-50 p-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-secondary">Amount to Pay</p>
            {selectedMethod === "upi" || course.priceUsd == null ? (
              <>
                <p className="mt-2 text-4xl font-bold text-slate-900">{formatInr(course.price)}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Pay exactly {formatInr(course.price)} via UPI
                  {course.priceUsd != null && <> (or {formatUsd(course.priceUsd)} via PayPal)</>}, then
                  submit the transaction reference to finish your enrollment.
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-4xl font-bold text-slate-900">{formatUsd(course.priceUsd)}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Pay exactly {formatUsd(course.priceUsd)} via PayPal (or {formatInr(course.price)}{" "}
                  via UPI), then submit the transaction reference to finish your enrollment.
                </p>
              </>
            )}
          </div>

          {isRejected && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Your previous enrollment request was declined by an admin. If you still want access,
              pay again and submit new payment details below — an admin will re-review them.
            </div>
          )}
          {isPendingWithoutPayment && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Your enrollment request is awaiting admin approval. Complete your payment details
              below so an admin can verify and grant access.
            </div>
          )}
          {paymentSubmitted && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Your payment details are submitted and awaiting admin verification. Entered a wrong
              reference? Submit the correct one below — it will replace the previous one.
            </div>
          )}

          {/* Two QR spots: UPI + PayPal. A missing QR file falls back to a
              "coming soon" panel so the spot is visible before the real QR
              is dropped into /public. */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {PAYMENT_METHODS.map((option) => {
              const isSelected = selectedMethod === option.method;
              return (
                <button
                  key={option.method}
                  type="button"
                  onClick={() => setSelectedMethod(option.method)}
                  className={`flex flex-col items-center gap-3 rounded-3xl border-2 p-6 text-center transition ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                      {option.label}
                    </span>
                    {isSelected && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  {qrFailed[option.method] ? (
                    <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm text-slate-500">
                      {option.label} QR coming soon — please contact the admin.
                    </div>
                  ) : (
                    <Image
                      src={option.qrSrc}
                      alt={`${option.label} payment QR code`}
                      width={option.method === "upi" ? 590 : 600}
                      height={option.method === "upi" ? 1280 : 600}
                      className="h-64 w-auto rounded-2xl border border-slate-200 object-contain"
                      onError={() =>
                        setQrFailed((prev) => ({ ...prev, [option.method]: true }))
                      }
                    />
                  )}
                  {option.method === "upi" ? (
                    <p className="text-base font-bold text-slate-900">{formatInr(course.price)}</p>
                  ) : course.priceUsd != null ? (
                    <p className="text-base font-bold text-slate-900">{formatUsd(course.priceUsd)}</p>
                  ) : (
                    <p className="text-sm font-medium text-amber-600">
                      USD price not configured for this course — please contact the admin.
                    </p>
                  )}
                  <p className="text-xs text-slate-500">{option.payToNote}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 space-y-2">
            <label htmlFor="payment-reference" className="text-sm font-medium text-slate-700">
              Transaction reference{" "}
              {selectedOption.method === "upi" ? "(UTR number)" : "(PayPal transaction ID)"}
            </label>
            <input
              id="payment-reference"
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={
                selectedOption.method === "upi"
                  ? "e.g. 123456789012"
                  : "e.g. 8XX12345678901234567890"
              }
              maxLength={REFERENCE_MAX_LENGTH}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-slate-500">
              Find this in your {selectedOption.label} app under the transaction receipt. An admin
              will manually match it against the received payment before granting access.
            </p>
          </div>

          {formError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => router.push(`/courses/${course.slug}`)}>
              Back to Course
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Payment Details"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}