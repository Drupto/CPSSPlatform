"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getUserProfile,
  isAdminProfile,
  getCourseById,
  getEnrollmentRequestsByStatus,
  getAllEnrollments,
  approveEnrollment,
  rejectEnrollment,
} from "@/lib/course";
import type { Enrollment, EnrollmentStatus, Course, UserProfile } from "@/lib/types";
import { formatCoursePrice } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Check, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Tab = "pending" | "approved" | "rejected";

interface RequestRow {
  enrollment: Enrollment;
  course: Course | null;
  user: UserProfile | null;
}

/**
 * Copies the payment reference so the admin can paste it into their UPI /
 * PayPal app to search for the matching transaction.
 */
function CopyReferenceButton({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the reference is
      // also selectable as plain text, so copying stays possible manually.
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 gap-1 px-2 text-xs"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

const dateFormat = (timestamp: any): string => {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

export default function AdminEnrollmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const loadRequests = useCallback(async (status: Tab) => {
    setLoading(true);
    try {
      // For the Approved tab, fetch everything so legacy enrollments
      // (no status field, normalized to "approved") are also shown, then
      // filter to only approved records.
      const enrollments =
        status === "approved"
          ? (await getAllEnrollments()).filter((e) => e.status === "approved")
          : await getEnrollmentRequestsByStatus(status as EnrollmentStatus);
      const enriched = await Promise.all(
        enrollments.map(async (enrollment) => {
          const [course, user] = await Promise.all([
            getCourseById(enrollment.courseId),
            getUserProfile(enrollment.userId),
          ]);
          return { enrollment, course, user };
        })
      );
      setRows(enriched);
    } catch (error) {
      console.error("Error loading enrollment requests:", error);
      toast({
        title: "Error",
        description: "Failed to load enrollment requests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      if (!currentUser) {
        router.push("/auth");
        return;
      }

      try {
        const profile = await getUserProfile(currentUser.uid);
        if (!isAdminProfile(profile)) {
          router.push("/");
          return;
        }

        setIsAdmin(true);
        await loadRequests("pending");
      } catch (err) {
        console.error("Error loading enrollment requests:", err);
        toast({
          title: "Error",
          description: "Failed to load enrollment requests. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, loadRequests]);

  useEffect(() => {
    if (isAdmin) {
      loadRequests(tab);
    }
  }, [tab, isAdmin, loadRequests]);

  const handleApprove = async (row: RequestRow) => {
    const admin = auth.currentUser;
    if (!admin) return;

    setProcessing((prev) => ({ ...prev, [row.enrollment.id]: true }));
    try {
      await approveEnrollment(row.enrollment.id, admin.uid);
      toast({ title: "Approved", description: "Student now has access to the course." });
      await loadRequests(tab);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to approve request.", variant: "destructive" });
    } finally {
      setProcessing((prev) => ({ ...prev, [row.enrollment.id]: false }));
    }
  };

  const handleReject = async (row: RequestRow) => {
    const admin = auth.currentUser;
    if (!admin) return;

    setProcessing((prev) => ({ ...prev, [row.enrollment.id]: true }));
    try {
      await rejectEnrollment(row.enrollment.id, admin.uid);
      toast({ title: "Rejected", description: "The enrollment request was declined." });
      await loadRequests(tab);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    } finally {
      setProcessing((prev) => ({ ...prev, [row.enrollment.id]: false }));
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <main className="relative min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="bg-white rounded-3xl shadow-lg p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Enrollment Requests</h1>
              <p className="text-slate-600 mt-2">Review and approve student course access requests.</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/admin")}>Back to Admin</Button>
          </div>

          <div className="flex gap-2 mb-8">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  tab === t.key
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-600">
              Loading requests...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">No {tab} requests</h2>
              <p className="text-slate-600">
                {tab === "pending"
                  ? "There are no pending enrollment requests right now."
                  : `There are no ${tab} enrollment requests.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => (
                <div
                  key={row.enrollment.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {row.course ? row.course.title : "Unknown Course"}
                        </h2>
                        {/* Expected amount in both currencies — INR (UPI) and
                            USD (PayPal), admin-set at course creation/edit —
                            so the admin knows what to look for when verifying
                            the payment on either rail. */}
                        {row.course && (
                          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            {formatCoursePrice(row.course)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        Student: {row.user?.displayName || row.user?.email || row.enrollment.userId}
                      </p>
                      <p className="text-xs text-slate-500">
                        Requested: {dateFormat(row.enrollment.requestedAt)}
                      </p>

                      {/* Manual payment verification: the admin matches the
                          reference against their UPI/PayPal app receipt. */}
                      {row.enrollment.paymentReference ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              row.enrollment.paymentMethod === "paypal"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {row.enrollment.paymentMethod === "paypal" ? "PayPal" : "UPI"}
                          </span>
                          <code className="rounded bg-white px-2 py-0.5 font-mono text-sm text-slate-800">
                            {row.enrollment.paymentReference}
                          </code>
                          <CopyReferenceButton reference={row.enrollment.paymentReference} />
                          <span className="text-xs text-slate-500">
                            Submitted: {dateFormat(row.enrollment.paymentSubmittedAt)}
                          </span>
                        </div>
                      ) : (
                        <p className="pt-1 text-xs text-slate-400">
                          Payment details not provided (legacy request)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {tab === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            disabled={processing[row.enrollment.id]}
                            onClick={() => handleReject(row)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {processing[row.enrollment.id] ? "..." : "Reject"}
                          </Button>
                          <Button
                            disabled={processing[row.enrollment.id]}
                            onClick={() => handleApprove(row)}
                          >
                            {processing[row.enrollment.id] ? "..." : "Approve"}
                          </Button>
                        </>
                      )}

                      {tab === "rejected" && (
                        <Button
                          disabled={processing[row.enrollment.id]}
                          onClick={() => handleApprove(row)}
                        >
                          {processing[row.enrollment.id] ? "..." : "Approve"}
                        </Button>
                      )}

                      {tab === "approved" && (
                        <Button
                          variant="outline"
                          disabled={processing[row.enrollment.id]}
                          onClick={() => handleReject(row)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {processing[row.enrollment.id] ? "..." : "Revoke Access"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10">
            <Link href="/admin" className="text-sm text-primary hover:underline">
              ← Return to Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
