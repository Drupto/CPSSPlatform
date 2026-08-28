import { Metadata } from "next";
import { requireRole } from "@/lib/auth-guard";
import { getInstituteByIdServer } from "@/lib/institute-server";
import { InstituteShell } from "./shell";
import type { Institute } from "@/lib/types";

export const metadata: Metadata = {
  title: "Institute | DruptoLMS",
  description: "DruptoLMS institute workspace — courses, students, sales, billing.",
  robots: { index: false, follow: false },
};

export default async function InstituteLayout({ children }: { children: React.ReactNode }) {
  // Server-side role enforcement. Redirects non-institute users to /auth.
  const profile = await requireRole("institute", "/auth");

  let institute: Institute | null = null;
  if (profile.instituteId) {
    institute = await getInstituteByIdServer(profile.instituteId);
  }

  return (
    <InstituteShell institute={institute}>
      {children}
    </InstituteShell>
  );
}