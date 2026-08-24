import type { Metadata } from "next";

/**
 * Auth route segment — noindex, nofollow.
 * Login/signup pages should never be indexed by search engines.
 */
export const metadata: Metadata = {
  title: "Sign In | KINÉTIKA",
  description: "Sign in or create an account to access KINÉTIKA's CSCS exam prep courses.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}