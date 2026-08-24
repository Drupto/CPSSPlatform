/**
 * Server-side Firebase Admin SDK singleton.
 *
 * The client SDK in `src/lib/firebase.ts` only initializes on the client
 * (`typeof window !== "undefined"`). For server-rendered metadata
 * (`generateMetadata`), `sitemap.ts`, and `robots.ts` we need to read
 * Firestore from the server. This module lazily initializes
 * `firebase-admin` and re-exports a typed Firestore instance.
 *
 * Credentials are resolved from the standard Google ADC chain:
 *   - `GOOGLE_APPLICATION_CREDENTIALS` env var (local dev / CI)
 *   - gcloud user creds (`gcloud auth application-default login`)
 *   - Cloud Run / App Hosting runtime service account (production)
 */

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App;

if (!getApps().length) {
  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (serviceAccountJson) {
    try {
      app = initializeApp({
        credential: cert(JSON.parse(serviceAccountJson)),
      });
    } catch {
      app = initializeApp();
    }
  } else {
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

export const adminDb: Firestore = getFirestore(app);
export default app;