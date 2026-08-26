import { auth } from "@/lib/firebase";

/**
 * Client-side helpers for the HTTP-only session cookie used by middleware.
 * Call `setSessionCookie()` after sign-in and `clearSessionCookie()` on logout.
 */

export async function setSessionCookie(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch (err) {
    console.error("Failed to set session cookie:", err);
  }
}

export async function clearSessionCookie(): Promise<void> {
  try {
    await fetch("/api/session", { method: "DELETE" });
  } catch (err) {
    console.error("Failed to clear session cookie:", err);
  }
}
