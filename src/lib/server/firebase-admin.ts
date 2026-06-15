import "server-only";

import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App;

function getAdminConfig() {
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (serviceAccountJson) {
    return {
      credential: cert(JSON.parse(serviceAccountJson)),
    };
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (privateKey && clientEmail) {
    return {
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    };
  }

  if (projectId) {
    return { projectId };
  }

  throw new Error(
    "Firebase project ID not configured. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID."
  );
}

export function getAdminApp() {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(getAdminConfig());
  }

  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
