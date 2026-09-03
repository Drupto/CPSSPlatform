"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Keeps the `__session` cookie in sync with the Firebase ID token.
 *
 * `onIdTokenChanged` fires on sign-in/out AND whenever the SDK rotates the
 * token (~hourly), so the cookie stays fresh. `src/middleware.ts` verifies
 * this cookie server-side to gate /admin/** routes (audit finding C3).
 *
 * The cookie carries the same ID token the client already uses — no new
 * secret is introduced. Custom claims (e.g. `admin: true`) are embedded in
 * the token, so a claim change requires sign-out/sign-in (or token refresh)
 * to take effect in the middleware.
 */
export function AuthCookieSync() {
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      if (user) {
        user
          .getIdToken()
          .then((token) => {
            const secure = window.location.protocol === "https:" ? "; secure" : "";
            document.cookie = `__session=${token}; path=/; max-age=3600; samesite=lax${secure}`;
          })
          .catch((err) => {
            console.error("[AuthCookieSync] Failed to refresh session cookie:", err);
          });
      } else {
        // Signed out — clear the cookie.
        document.cookie = "__session=; path=/; max-age=0; samesite=lax";
      }
    });
    return unsubscribe;
  }, []);

  return null;
}
