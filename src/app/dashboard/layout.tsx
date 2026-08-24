import type { Metadata } from "next";

/**
 * Dashboard route segment — noindex, nofollow.
 * All authenticated student pages are private and should not be indexed.
 */
export const metadata: Metadata = {
  title: "Dashboard | KINÉTIKA",
  description: "Your KINÉTIKA learning dashboard — track progress, manage courses, and access resources.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}