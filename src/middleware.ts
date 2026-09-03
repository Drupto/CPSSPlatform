import { NextRequest, NextResponse } from "next/server";
// Deep subpath imports keep the Edge bundle lean — pulling in `jose`'s root
// index would also bundle JWE encryption modules (and their CompressionStream
// warning) that token *verification* never uses.
import { createRemoteJWKSet } from "jose/jwks/remote";
import { jwtVerify } from "jose/jwt/verify";

/**
 * Server-side admin authorization (audit finding C3).
 *
 * Every request to /admin/** is gated here — BEFORE the page is rendered — by
 * verifying the Firebase ID token stored in the `__session` cookie:
 *
 *   1. Signature is checked against Google's public JWKS (RS256).
 *   2. `iss` / `aud` are checked against this Firebase project.
 *   3. The `admin` custom claim must be exactly `true`.
 *
 * The cookie is written/refreshed client-side by `AuthCookieSync`
 * (src/components/auth-cookie-sync.tsx) via `onIdTokenChanged`, so it stays
 * fresh (ID tokens rotate about hourly). Custom claims are granted with
 * `scripts/sync-admin-claims.mjs` (run once per admin, then sign in again so
 * the refreshed token embeds the claim).
 *
 * The client-side `isAdminProfile` checks in the admin pages remain as a
 * second layer (and handle UX), but the page markup itself is no longer
 * served without a verified admin token. Fail-closed: any missing, expired,
 * or invalid token is redirected — never allowed through.
 */

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

export async function middleware(request: NextRequest) {
  const signInUrl = new URL("/auth", request.url);

  // Fail closed if the project ID isn't available (misconfigured build).
  if (!PROJECT_ID) {
    console.error("[middleware] NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set — denying /admin access");
    return NextResponse.redirect(signInUrl);
  }

  const token = request.cookies.get("__session")?.value;
  if (!token) {
    return NextResponse.redirect(signInUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });

    if (payload.admin !== true) {
      // Authenticated, but not an admin → send to the public site.
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch {
    // Expired, tampered, or otherwise invalid token → force re-auth.
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
