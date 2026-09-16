#!/usr/bin/env node
/**
 * One-off migration: normalizes quiz time limits to MINUTES.
 *
 * CSCS_Practice_Quiz_Bank.json expresses time limits in SECONDS (e.g. 3000 =
 * 50 minutes), and scripts/import-quizzes.mjs used to write them verbatim.
 * The platform treats quiz.timeLimit as MINUTES everywhere else
 * (functions/src/quiz-attempts.ts getQuizTimeLimitSeconds, the admin form
 * label), so imported quizzes showed a "3000:00" timer and abandoned quiz
 * sessions locked restarts for ~50 hours.
 *
 * This script finds quiz documents whose stored timeLimit is implausibly
 * large for a MINUTES field (>= --threshold-minutes, default 1440 = a full
 * day) and rewrites the value as Math.round(seconds / 60).
 *
 * SAFETY MODEL (mirrors scripts/import-quizzes.mjs):
 *  - DRY-RUN BY DEFAULT: nothing is written unless --apply is passed.
 *  - Only the timeLimit field is touched (update(), never set/overwrite).
 *  - Idempotent: converted values (50, 52, 80, ...) fall below the threshold,
 *    so re-running with --apply is a no-op.
 *
 * Usage:
 *   # Dry-run across ALL courses (default)
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/migrate-quiz-timelimits.mjs
 *
 *   # Restrict to specific courses / write for real
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/migrate-quiz-timelimits.mjs \
 *     --course EEOu2lW9W2q7BIXVq7EC --course J69eKSRjQmulK1oNpfFP --apply
 */

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DEFAULT_THRESHOLD_MINUTES = 1440; // 24h — no real limit is this long in minutes

function parseArgs(argv) {
  const args = {
    apply: false,
    project: undefined,
    courses: [],
    thresholdMinutes: DEFAULT_THRESHOLD_MINUTES,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--project") args.project = argv[++i];
    else if (arg === "--course") args.courses.push(argv[++i]);
    else if (arg === "--threshold-minutes") args.thresholdMinutes = Number(argv[++i]);
    else if (arg === "--help" || arg === "-h") {
      console.log("Flags: --apply | --dry-run | --course <id> (repeatable) | --threshold-minutes <n> | --project <id>");
      process.exit(0);
    } else {
      console.error(`✗ Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!Number.isFinite(args.thresholdMinutes) || args.thresholdMinutes < 1) {
    console.error("✗ --threshold-minutes must be a number >= 1");
    process.exit(2);
  }
  return args;
}

function resolveCredential() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  return applicationDefault();
}

/** The seconds→minutes conversion shared with scripts/import-quizzes.mjs. */
function toMinutes(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, Math.round(value / 60));
}

function describeDoc(docSnap) {
  const coursePath = docSnap.ref.parent.parent ? docSnap.ref.parent.parent.id : "(orphan)";
  return `courses/${coursePath}/quizzes/${docSnap.id} "${docSnap.get("title") ?? "(untitled)"}"`;
}

async function collectQuizDocs(db, args) {
  if (args.courses.length > 0) {
    const docs = [];
    for (const courseId of args.courses) {
      const snapshot = await db.collection(`courses/${courseId}/quizzes`).get();
      snapshot.forEach((docSnap) => docs.push(docSnap));
      console.log(`Course ${courseId}: ${snapshot.size} quiz doc(s)`);
    }
    return docs;
  }

  const docs = [];
  const snapshot = await db.collectionGroup("quizzes").get();
  snapshot.forEach((docSnap) => docs.push(docSnap));
  console.log(`Scanned collectionGroup("quizzes"): ${snapshot.size} doc(s)`);
  return docs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const app = initializeApp({ credential: resolveCredential(), ...(args.project ? { projectId: args.project } : {}) });
  const db = getFirestore();
  console.log(`Connected to Firebase project: ${args.project ?? app.options.projectId ?? "(default)"}`);
  console.log(`Threshold: timeLimit >= ${args.thresholdMinutes} (stored minutes) is treated as a seconds value.\n`);

  const quizDocs = await collectQuizDocs(db, args);

  const plans = [];
  let checked = 0;
  for (const docSnap of quizDocs) {
    checked += 1;
    const raw = docSnap.get("timeLimit");
    if (raw === undefined || raw === null) continue;

    const value = Number(raw);
    if (!Number.isFinite(value) || value < args.thresholdMinutes) continue;

    const minutes = toMinutes(value);
    if (minutes === null || minutes >= args.thresholdMinutes) {
      // Converting would still exceed the threshold — report, don't touch.
      console.log(`⚠ Skipped (converted value still >= threshold): ${describeDoc(docSnap)} timeLimit=${value}`);
      continue;
    }

    plans.push({ docSnap, from: value, to: minutes });
  }

  console.log(`\nChecked ${checked} quiz doc(s); ${plans.length} need conversion:\n`);
  for (const plan of plans) {
    console.log(`  • ${describeDoc(plan.docSnap)}: timeLimit ${plan.from} → ${plan.to}`);
  }

  if (plans.length === 0) {
    console.log("\nNothing to migrate.");
    return;
  }

  if (!args.apply) {
    console.log("\nDry-run complete. Re-run with --apply to write these updates.");
    return;
  }

  console.log("\n=== APPLY — updating timeLimit values ===");
  for (const plan of plans) {
    await plan.docSnap.ref.update({ timeLimit: plan.to });
    console.log(`  ✓ ${describeDoc(plan.docSnap)}: timeLimit ${plan.from} → ${plan.to}`);
  }

  console.log("\n=== VERIFICATION — reading back ===");
  for (const plan of plans) {
    const fresh = await plan.docSnap.ref.get();
    console.log(`  • ${describeDoc(fresh)}: timeLimit=${fresh.get("timeLimit")}`);
  }

  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n✗ FAILED: ${err.message}`);
    process.exit(1);
  });

