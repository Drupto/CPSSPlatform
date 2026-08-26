import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase-admin";
import type { UserRole } from "@/lib/types";

/**
 * Server-side role guard for private panels (super / institute).
 *
 * Runs inside a server component (e.g. the panel's `layout.tsx`) on the Node
 * runtime, where firebase-admin can verify the `__session` cookie set by
 * `/api/session`. This is the reliable mechanism — Next.js edge middleware
 * cannot bundle firebase-admin, and Node-runtime middleware is not reliable
 * in the Next 15.5 app under the `src/` layout.
 *
 * When the cookie is absent/invalid or the role mismatches, the caller is
 * redirected to `/auth` with a `redirect` query parameter.
 *
 * Usage (in a server layout/page):
 *   await requireRole("super");
 *   await requireRole("institute");
 *   const profile = await sessionProfile(); // returns { uid, role } or null
 */
export async function sessionProfile(): Promise<{ uid: string; role?: UserRole } | null> {
  const token = (await cookies()).get("__session")?.value;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const role = (decoded.role as UserRole | undefined) ?? undefined;
    return { uid: decoded.uid, role };
  } catch (err) {
    // Invalid/expired cookie.
    if (process.env.NODE_ENV !== "production") {
      console.error("[sessionProfile] verification failed:", err);
    }
    return null;
  }
}

export async function requireRole(
  role: UserRole,
  redirectPath = "/auth"
): Promise<{ uid: string; role?: UserRole }> {
  const profile = await sessionProfile();
  if (!profile || profile.role !== role) {
    redirect(`${redirectPath}?redirect=${encodeURIComponent("/")}`);
  }
  return profile;
}

/** Returns true when the caller is authenticated at all (any role). */
export async function isAuthenticated(): Promise<boolean> {
  return (await sessionProfile()) !== null;
}