#!/usr/bin/env node
/**
 * One-off backfill for legacy flashcard resource documents.
 *
 * Fixes two data issues left by earlier versions of the flashcards feature:
 *  1. Flashcard documents missing `front`/`back` (an earlier version of
 *     `addCourseResource` in src/lib/course.ts silently dropped those fields
 *     on create) — sets them to empty strings so the study UI renders them
 *     and admins can fill in the content.
 *  2. Non-flashcard resources carrying stale `front`/`back` fields (left
 *     behind when a resource's type was switched) — removes them.
 *
 * DRY-RUN BY DEFAULT: pass --apply to write changes.
 *
 * Usage:
 *   node scripts/backfill-flashcards.mjs             # report only
 *   node scripts/backfill-flashcards.mjs --apply     # write changes
 *
 * Credentials (standard ADC chain, same as sync-admin-claims.mjs):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/backfill-flashcards.mjs --apply
 *   (or set GOOGLE_APPLICATION_CREDENTIALS_JSON='<inline service-account JSON>')
 *
 * The Firebase project is resolved from the service account / ADC — or pass
 * --project <id> to override.
 */

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");

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

try {
  // collectionGroup("resources") covers every course in one query; the
  // flashcard filtering is done client-side so no composite index is needed.
  const snapshot = await db.collectionGroup("resources").get();

  if (snapshot.empty) {
    console.log("No course resources found. Nothing to do.");
    process.exit(0);
  }

  let scanned = 0;
  let cardsFixed = 0;
  let staleCleaned = 0;

  for (const document of snapshot.docs) {
    scanned++;
    const data = document.data();
    const course = document.ref.parent.parent; // courses/{courseId}
    const location = `courses/${course?.id ?? "?"}/resources/${document.id}`;
    const updates = {};

    if (data.type === "flashcard") {
      const missing = [];
      if (typeof data.front !== "string") { updates.front = ""; missing.push("front"); }
      if (typeof data.back !== "string") { updates.back = ""; missing.push("back"); }
      if (missing.length > 0) {
        console.log(`• Flashcard missing ${missing.join(" + ")}: ${location} ("${data.title ?? "untitled"}")`);
        cardsFixed++;
      }
    } else if ("front" in data || "back" in data) {
      updates.front = FieldValue.delete();
      updates.back = FieldValue.delete();
      console.log(`• Stale flashcard fields on "${data.type}" resource: ${location} ("${data.title ?? "untitled"}")`);
      staleCleaned++;
    }

    if (APPLY && Object.keys(updates).length > 0) {
      try {
        await document.ref.set(updates, { merge: true });
        console.log(`  ✓ Applied updates to ${location}`);
      } catch (err) {
        console.error(`  ✗ Failed for ${location}:`, err?.message ?? err);
      }
    }
  }

  console.log(`\nScanned ${scanned} resource document(s).`);
  console.log(`  Flashcards missing content: ${cardsFixed}`);
  console.log(`  Non-flashcards with stale fields: ${staleCleaned}`);
  if (!APPLY) {
    console.log("\nDRY RUN — no changes written. Re-run with --apply to write updates.");
  } else {
    console.log("\nDone.");
  }
  process.exit(0);
} catch (err) {
  console.error("Fatal error:", err);
  process.exit(1);
}