#!/usr/bin/env node
/**
 * Grants the `admin: true` custom claim to every Firebase Auth user whose
 * Firestore profile (users/{uid}.role) is 'admin'.
 *
 * REQUIRED ONE-TIME MIGRATION before deploying src/middleware.ts — the
 * middleware checks the token's `admin` claim, not the Firestore role.
 * Re-run this script whenever you promote a new admin in the Firestore
 * console. Users must sign out and back in (or wait for token refresh)
 * after the claim is set.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/sync-admin-claims.mjs
 *   (or set GOOGLE_APPLICATION_CREDENTIALS_JSON='<inline service-account JSON>')
 *
 * The Firebase project is resolved from the service account / ADC — or pass
 * --project <id> to override.
 */

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

function resolveCredential() {
  const inline = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (inline) {
    return cert(JSON.parse(inline));
  }
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) {
    return cert(JSON.parse(readFileSync(path, "utf8")));
  }
  // Fall back to gcloud user credentials (ADC).
  return applicationDefault();
}

const projectArgIdx = process.argv.indexOf("--project");
const projectId =
  projectArgIdx !== -1 ? process.argv[projectArgIdx + 1] : process.env.GOOGLE_CLOUD_PROJECT || undefined;

initializeApp({ credential: resolveCredential(), ...(projectId ? { projectId } : {}) });

const db = getFirestore();
const auth = getAuth();

try {
  const snapshot = await db.collection("users").where("role", "==", "admin").get();

  if (snapshot.empty) {
    console.log("No users with role == 'admin' found in Firestore. Nothing to do.");
    process.exit(0);
  }

  let updated = 0;
  for (const doc of snapshot.docs) {
    try {
      await auth.setCustomUserClaims(doc.id, { admin: true });
      console.log(`✓ Set admin claim for ${doc.data().email ?? "(no email)"} (${doc.id})`);
      updated++;
    } catch (err) {
      console.error(`✗ Failed for ${doc.id}:`, err?.message ?? err);
    }
  }

  console.log(`\nDone. ${updated}/${snapshot.size} admin user(s) updated.`);
  console.log("Note: affected users must sign out and back in for the claim to reach their ID token.");
  process.exit(0);
} catch (err) {
  console.error("Fatal error:", err);
  process.exit(1);
}
