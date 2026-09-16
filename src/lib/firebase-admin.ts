/**
 * Server-side Firebase Admin SDK singleton.
 *
 * The client SDK in `src/lib/firebase.ts` only initializes on the client
 * (`typeof window !== "undefined"`). For server-rendered metadata
 * (`generateMetadata`), `sitemap.ts`, and `robots.ts` we need to read
 * Firestore from the server. This module lazily initializes
 * `firebase-admin` and re-exports a typed Firestore instance.
 *
 * Credentials are resolved in this order (first match wins):
 *   1. Discrete environment variables (Netlify / CI friendly):
 *        FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY
 *        (+ optional FIREBASE_ADMIN_PROJECT_ID)
 *      `FIREBASE_ADMIN_PRIVATE_KEY` is a secret — store it as a masked
 *      "secret value" on Netlify so it never appears in logs/dashboard.
 *      Single-line values containing literal `\n` escapes are normalized
 *      to real newlines automatically.
 *   2. `GOOGLE_APPLICATION_CREDENTIALS_JSON` — the entire service-account
 *      JSON pasted inline (never a file path).
 *   3. Standard Google ADC chain:
 *        - `GOOGLE_APPLICATION_CREDENTIALS` env var (local dev / CI)
 *        - gcloud user creds (`gcloud auth application-default login`)
 *        - Cloud Run / App Hosting runtime service account (production)
 */

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App;

/**
 * Hosting providers and dotenv files frequently deliver the private key as a
 * single line with literal `\n` escapes instead of real newlines, which PEM
 * parsing cannot read. Normalize both representations to real newlines.
 */
function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

/** Method 1: discrete FIREBASE_ADMIN_* variables (Netlify / CI). */
function initFromDiscreteEnvVars(): App | null {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;

  // Nothing configured for this path — defer silently to the next method.
  if (!clientEmail && !privateKey && !projectId) return null;

  if (!clientEmail || !privateKey) {
    // Partial configuration would otherwise fall through and fail at query
    // time with a generic ADC error, hiding the real cause.
    const missing = [
      !clientEmail && "FIREBASE_ADMIN_CLIENT_EMAIL",
      !privateKey && "FIREBASE_ADMIN_PRIVATE_KEY",
    ]
      .filter(Boolean)
      .join(", ");
    console.warn(
      "[firebase-admin] FIREBASE_ADMIN_* variables are only partially set — missing: " +
        `${missing}. Set client email and private key (plus optional project id) ` +
        "together, or unset them all to use another credential method."
    );
    return null;
  }

  try {
    return initializeApp({
      credential: cert({
        ...(projectId ? { projectId } : {}),
        clientEmail: clientEmail,
        privateKey: normalizePrivateKey(privateKey),
      }),
      ...(projectId ? { projectId } : {}),
    });
  } catch (certError) {
    console.warn(
      "[firebase-admin] FIREBASE_ADMIN_* variables are set but the credential was rejected — " +
        "is FIREBASE_ADMIN_PRIVATE_KEY the full -----BEGIN/END PRIVATE KEY----- value? " +
        "Falling back to the next credential method. Cause:",
      certError instanceof Error ? certError.message : certError
    );
    return null;
  }
}

/** Method 2: the whole service-account JSON pasted inline (Netlify / CI). */
function initFromInlineJson(): App | null {
  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!serviceAccountJson) return null;
  try {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
    });
  } catch (parseError) {
    // Do not swallow this silently: a misconfigured value would otherwise
    // degrade to ADC and surface later as "Could not load the default
    // credentials" at query time, hiding the real cause.
    console.warn(
      "[firebase-admin] GOOGLE_APPLICATION_CREDENTIALS_JSON is set but could not be parsed " +
        "as inline JSON, falling back to ADC. The variable must contain the service-account " +
        "JSON itself — not a file path (for a file path use GOOGLE_APPLICATION_CREDENTIALS). " +
        "Cause:",
      parseError instanceof Error ? parseError.message : parseError
    );
    return null;
  }
}

if (!getApps().length) {
  // Method 3: standard Google ADC chain (file path, gcloud, runtime SA).
  app = initFromDiscreteEnvVars() ?? initFromInlineJson() ?? initializeApp();
} else {
  app = getApps()[0];
}

export const adminDb: Firestore = getFirestore(app);
export default app;