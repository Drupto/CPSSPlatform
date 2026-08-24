import type { Metadata } from "next";

/**
 * Learn route segment — noindex, nofollow.
 * Course learning pages are gated behind enrollment and should not be indexed.
 */
export const metadata: Metadata = {
  title: "Learn | KINÉTIKA",
  description: "Access your enrolled course content on KINÉTIKA.",
  robots: { index: false, follow: false },
};

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
