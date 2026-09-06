import type { Metadata } from "next";

/**
 * Payment route segment — noindex, nofollow.
 * The payment page is part of the private enrollment flow and must never be
 * indexed by search engines.
 */
export const metadata: Metadata = {
  title: "Payment | KINÉTIKA",
  description: "Complete your course enrollment payment on KINÉTIKA.",
  robots: { index: false, follow: false },
};

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}