import { Metadata } from "next";
import { requireRole } from "@/lib/auth-guard";
import { SuperShell } from "./shell";

export const metadata: Metadata = {
  title: "Super Admin | DruptoLMS",
  description: "DruptoLMS platform administration — plans, institutes, orders, payouts.",
  robots: { index: false, follow: false },
};

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  // Server-side role enforcement (Node runtime). Redirects to /auth when not super.
  await requireRole("super", "/auth");
  return <SuperShell>{children}</SuperShell>;
}