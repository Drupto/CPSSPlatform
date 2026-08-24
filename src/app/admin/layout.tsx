import type { Metadata } from "next";

/**
 * Admin route segment — noindex, nofollow.
 * All admin pages are private and must never be indexed by search engines.
 */
export const metadata: Metadata = {
  title: "Admin | KINÉTIKA",
  description: "KINÉTIKA admin dashboard for course management, enrollments, and analytics.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}