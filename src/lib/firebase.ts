"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const REQUIRED_KEYS: (keyof typeof firebaseConfig)[] = [
  "apiKey",
  "authDomain",
  "projectId",
  "appId",
];

function validateConfig() {
  const missing = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Missing environment variables: ${missing
        .map((k) => `NEXT_PUBLIC_FIREBASE_${k.replace(/([A-Z])/g, "_$1").toUpperCase()}`)
        .join(", ")}. ` +
        `Add them to your .env.local file and restart the dev server.`
    );
  }
}

// Initialize Firebase only on client-side to prevent build-time errors
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: ReturnType<typeof getFunctions> | undefined;

if (typeof window !== "undefined") {
  validateConfig();

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  // initializeFirestore lets us set SDK settings explicitly (e.g. long-polling fallback)
  db = initializeFirestore(app, {});
  storage = getStorage(app);
  functions = getFunctions(app);

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    try {
      connectFunctionsEmulator(functions, "localhost", 5001);
    } catch {
      // Already connected or emulator not running
    }
  }
}

/**
 * Translates opaque network errors (e.g. "Failed to fetch") into a clear,
 * actionable message. A network-level failure when talking to Firestore almost
 * always means the Firestore API is disabled, the database isn't created, or the
 * projectId is wrong — not a bug in the app code.
 */
export function describeFirestoreError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Failed to fetch") || message === "Network Error") {
    return (
      "Could not reach Firestore. This is usually a project configuration issue, not a code bug:\n" +
      "  1. Enable the Firestore API for this project (https://console.cloud.google.com/apis/library/firestore.googleapis.com).\n" +
      "  2. Create a Firestore database in the Firebase console (Native mode).\n" +
      "  3. Verify NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local matches this project.\n" +
      "  4. If you use an API-key restriction, allow localhost:9002 as an HTTP referrer."
    );
  }
  return message;
}

export { app, auth, db, storage, functions };
export default app;
