#!/usr/bin/env node
/**
 * Chunked quiz importer for course quizzes.
 *
 * Imports quizzes from a JSON file into the Firestore subcollections
 * `courses/{courseId}/quizzes` — the same document shape createQuiz() in
 * src/lib/course.ts writes and that firestore.rules validates via
 * isValidQuizData(). Quiz docs contain the answer key: direct reads are
 * admin-only, and students are served sanitized quizzes via the
 * getQuizForStudent callable (functions/src/quizzes.ts).
 *
 * SAFETY MODEL:
 *  - DRY-RUN BY DEFAULT: nothing is written unless --apply is passed.
 *  - Additive only: creates new quiz documents; never deletes, updates, or
 *    overwrites existing ones. Quiz edits happen in the admin UI.
 *  - Idempotent: deterministic doc ids (SHA-256 of title + questions) —
 *    re-running a chunk skips quizzes that already exist, so interrupted
 *    imports can be retried safely without duplicates.
 *  - One quiz per commit: quizzes are listed by createdAt (newest first), so
 *    each quiz is committed separately, in reverse file order — the file's
 *    first quiz ends up with the newest timestamp and appears first.
 *  - Validation mirrors isValidQuizData() in firestore.rules PLUS the admin
 *    form's per-question checks (>= 2 non-empty options, in-bounds
 *    correctAnswerIndex); invalid quizzes are reported and skipped, never
 *    half-written. Question ids are generated deterministically (q1..qN)
 *    unless the source entry supplies one.
 *  - Credentials: firebase-admin via the standard ADC chain, exactly like
 *    scripts/backfill-flashcards.mjs and scripts/import-flashcards.mjs.
 *
 * Usage:
 *   # List quizzes in the data file (no credentials needed)
 *   node scripts/import-quizzes.mjs --list-quizzes
 *
 *   # Dry-run (default): print the write plan for one quiz, both courses
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/import-quizzes.mjs \
 *     --file CSCS_Practice_Quiz_Bank.json \
 *     --quiz "Scientific Foundations - Exam One" \
 *     --course EEOu2lW9W2q7BIXVq7EC \
 *     --course J69eKSRjQmulK1oNpfFP
 *
 *   # Write for real: same command with --apply
 *   # Print every question in the report: add --verbose
 *
 * Flags:
 *   --file <path>     data file (default: <repo root>/CSCS_Practice_Quiz_Bank.json)
 *   --quiz <title>    import only these quizzes (repeatable; default: all)
 *   --course <id>     target course (repeatable, required unless --list-quizzes)
 *   --project <id>    override Firebase project id
 *   --list-quizzes    show quiz titles + question counts, then exit
 *   --verbose         list every question in the dry-run report
 *   --apply           actually write to Firestore
 *   --dry-run         explicit no-op (dry-run is already the default)
 */

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_FILE = resolve(REPO_ROOT, "CSCS_Practice_Quiz_Bank.json");
const MAX_QUESTIONS = 100; // Firestore rule cap: questions.size() <= 100

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    apply: false,
    file: DEFAULT_FILE,
    quizTitles: [],
    courses: [],
    project: undefined,
    listQuizzes: false,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const nextValue = () => {
      const v = argv[i + 1];
      if (v === undefined) {
        console.error(`Missing value for ${flag}`);
        process.exit(2);
      }
      i += 1;
      return v;
    };
    switch (flag) {
      case "--apply": args.apply = true; break;
      case "--file": args.file = resolve(nextValue()); break;
      case "--quiz": args.quizTitles.push(nextValue()); break;
      case "--course": args.courses.push(nextValue()); break;
      case "--project": args.project = nextValue(); break;
      case "--list-quizzes": args.listQuizzes = true; break;
      case "--verbose": args.verbose = true; break;
      case "--dry-run": break; // default behavior; accepted for explicitness
      default:
        console.error(`Unknown argument: ${flag}`);
        process.exit(2);
    }
  }
  return args;
}

function truncate(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** The JSON stores time limits in SECONDS; the platform stores MINUTES. */
function quizTimeLimitMinutes(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.max(1, Math.round(value / 60));
}

function previewQuiz(quiz) {
  const stored = quizTimeLimitMinutes(quiz.timeLimit);
  const tl = stored !== undefined
    ? `, time limit ${quiz.timeLimit}s → stored as ${stored} min`
    : ", no time limit";
  return `    • "${quiz.title}" | ${quiz.questions.length} question(s) | pass ${quiz.passPercentage}% | ${quiz.maxAttempts} attempt(s)${tl}`;
}

function previewQuestion(q) {
  const correct = q.options[q.correctAnswerIndex] ?? "(out of bounds)";
  return `    [${q.id}] ${truncate(q.question, 80)} => ${truncate(correct, 50)}`;
}

// ---------------------------------------------------------------------------
// Data file loading + validation (mirrors isValidQuizData in firestore.rules
// plus the admin form's per-question checks in QuizForm.tsx)
// ---------------------------------------------------------------------------

function loadQuizzes(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  } catch (err) {
    console.error(`✗ Cannot read data file: ${file}\n  ${err.message}`);
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`✗ Data file is not valid JSON: ${file}\n  ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error(`✗ Data file must be a JSON array of quiz objects.`);
    process.exit(1);
  }
  return data;
}

function countQuizzes(quizzes) {
  const counts = new Map();
  for (const entry of quizzes) {
    const title = typeof entry.title === "string" ? entry.title.trim() : "(no title)";
    const n = Array.isArray(entry.questions) ? entry.questions.length : 0;
    counts.set(title, (counts.get(title) ?? 0) + n);
  }
  return counts;
}

function printQuizList(counts) {
  console.log("Quizzes available in the data file:");
  for (const [title, count] of counts) console.log(`  • ${title}: ${count} question(s)`);
}

function validateQuiz(entry, index) {
  const errors = [];
  const title = typeof entry.title === "string" ? entry.title.trim() : null;
  const description = typeof entry.description === "string" ? entry.description.trim() : "";
  const passPercentage = entry.passPercentage ?? 70;
  const maxAttempts = entry.maxAttempts ?? 1;
  const randomizeQuestionOrder = entry.randomizeQuestionOrder ?? false;
  const randomizeAnswerOrder = entry.randomizeAnswerOrder ?? false;
  const timeLimit =
    entry.timeLimit !== undefined && entry.timeLimit !== null ? entry.timeLimit : undefined;

  if (title === null) errors.push("title is not a string");
  else if (title.length === 0) errors.push("title is empty");
  else if (title.length > 200) errors.push(`title exceeds 200 chars (${title.length})`);
  if (description.length > 2000) errors.push(`description exceeds 2000 chars (${description.length})`);
  if (!Number.isInteger(passPercentage) || passPercentage < 0 || passPercentage > 100)
    errors.push(`passPercentage must be an int 0-100 (${passPercentage})`);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100)
    errors.push(`maxAttempts must be an int 1-100 (${maxAttempts})`);
  if (timeLimit !== undefined && (!Number.isInteger(timeLimit) || timeLimit < 0))
    errors.push(`timeLimit must be an int >= 0 (${timeLimit})`);
  if (typeof randomizeQuestionOrder !== "boolean") errors.push("randomizeQuestionOrder must be a boolean");
  if (typeof randomizeAnswerOrder !== "boolean") errors.push("randomizeAnswerOrder must be a boolean");

  let questions = [];
  if (!Array.isArray(entry.questions) || entry.questions.length === 0) {
    errors.push("questions must be a non-empty list");
  } else if (entry.questions.length > MAX_QUESTIONS) {
    errors.push(`questions exceeds the 100-question cap (${entry.questions.length})`);
  } else {
    entry.questions.forEach((q, i) => {
      if (typeof q !== "object" || q === null) {
        errors.push(`question ${i + 1}: not an object`);
        return;
      }
      const question = typeof q.question === "string" ? q.question.trim() : "";
      if (!question) {
        errors.push(`question ${i + 1}: text is empty/not a string`);
        return;
      }
      const options = Array.isArray(q.options) ? q.options : null;
      if (!options || options.length < 2) {
        errors.push(`question ${i + 1}: needs >= 2 options`);
        return;
      }
      const cleaned = [];
      let bad = false;
      for (const o of options) {
        const v = typeof o === "string" ? o.trim() : "";
        if (!v) {
          errors.push(`question ${i + 1}: an option is empty/not a string`);
          bad = true;
          break;
        }
        cleaned.push(v);
      }
      if (bad) return;
      const idx = q.correctAnswerIndex;
      if (!Number.isInteger(idx) || idx < 0 || idx >= cleaned.length) {
        errors.push(`question ${i + 1}: correctAnswerIndex ${idx} out of bounds (options=${cleaned.length})`);
        return;
      }
      const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";
      const id = typeof q.id === "string" && q.id.trim() ? q.id.trim() : `q${i + 1}`;
      questions.push({
        id,
        question,
        options: cleaned,
        correctAnswerIndex: idx,
        ...(explanation ? { explanation } : {}),
      });
    });
  }

  const extra = Object.keys(entry).filter(
    (k) => !["title", "description", "passPercentage", "maxAttempts", "timeLimit", "randomizeQuestionOrder", "randomizeAnswerOrder", "questions"].includes(k)
  );
  if (extra.length > 0) errors.push(`unexpected field(s) ignored: ${extra.join(", ")}`);

  if (errors.length > 0) return { quiz: null, errors };
  return {
    quiz: {
      title,
      description,
      passPercentage,
      maxAttempts,
      ...(timeLimit !== undefined ? { timeLimit } : {}),
      randomizeQuestionOrder,
      randomizeAnswerOrder,
      questions,
    },
    errors,
  };
}

/** Deterministic quiz document id → safe re-runs without duplicates. */
function quizDocId(quiz) {
  return createHash("sha256").update(`${quiz.title}\u0000${JSON.stringify(quiz.questions)}`, "utf8").digest("hex");
}

function resolveCredential() {
  const inline = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (inline) return cert(JSON.parse(inline));
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) return cert(JSON.parse(readFileSync(path, "utf8")));
  // Fall back to gcloud user credentials (ADC).
  return applicationDefault();
}

// ---------------------------------------------------------------------------
// Firestore planning
// ---------------------------------------------------------------------------

async function planCourse(db, courseId, quizzes) {
  const courseRef = db.collection("courses").doc(courseId);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) {
    throw new Error(`Course "${courseId}" does not exist — aborting before any writes`);
  }
  const courseData = courseSnap.data() ?? {};
  const quizSnap = await courseRef.collection("quizzes").get();

  const existingIds = new Set();
  quizSnap.forEach((d) => existingIds.add(d.id));

  const planned = [];
  let skippedExisting = 0;
  for (const quiz of quizzes) {
    if (existingIds.has(quiz.id)) {
      skippedExisting += 1;
      continue;
    }
    planned.push(quiz);
  }

  return {
    id: courseId,
    title: courseData.title ?? "(untitled)",
    published: courseData.published === true,
    existingQuizzes: quizSnap.size,
    planned,
    skippedExisting,
  };
}

function printPlan(course, verbose) {
  console.log(`\nCourse ${course.id} — "${course.title}" (published: ${course.published})`);
  console.log(`  Existing quizzes: ${course.existingQuizzes} | quizzes to create: ${course.planned.length} | already imported (will skip): ${course.skippedExisting}`);
  if (course.planned.length > 0) {
    for (const quiz of course.planned) console.log(previewQuiz(quiz));
    console.log(`  ${verbose ? "All planned questions:" : "Sample (first 3 questions of the first quiz):"}`);
    const first = course.planned[0];
    const shown = verbose ? first.questions : first.questions.slice(0, 3);
    for (const q of shown) console.log(previewQuestion(q));
    if (!verbose && first.questions.length > 3) {
      console.log(`    … ${first.questions.length - 3} more in this quiz (use --verbose to list all)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Writing + verification
// ---------------------------------------------------------------------------

async function writePlanned(db, course) {
  const courseRef = db.collection("courses").doc(course.id);
  let written = 0;
  // One quiz per commit: quizzes are listed by createdAt (newest first), and
  // each quiz is planned in reverse file order, so sequential commits give
  // the file's first quiz the newest timestamp and the top display slot.
  for (const quiz of course.planned) {
    const batch = db.batch();
    batch.set(courseRef.collection("quizzes").doc(quiz.id), {
      title: quiz.title,
      description: quiz.description,
      passPercentage: quiz.passPercentage,
      maxAttempts: quiz.maxAttempts,
      // Convert the JSON's seconds to the platform's minutes unit (see
      // quizTimeLimitMinutes) so the student-facing timer shows sane values.
      ...(quizTimeLimitMinutes(quiz.timeLimit) !== undefined
        ? { timeLimit: quizTimeLimitMinutes(quiz.timeLimit) }
        : {}),
      randomizeQuestionOrder: quiz.randomizeQuestionOrder,
      randomizeAnswerOrder: quiz.randomizeAnswerOrder,
      questions: quiz.questions,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error(`  ✗ Failed to write "${quiz.title}" after ${written} quiz(es): ${err.message}`);
      console.error(`    Safe to re-run the same command: already-written quizzes are skipped by id, so only the remainder is written.`);
      throw err;
    }
    written += 1;
    console.log(`  ✓ Wrote "${quiz.title}" (${quiz.questions.length} question(s)) — ${written}/${course.planned.length}`);
  }
  return written;
}

async function verifyCourse(db, courseId) {
  const snap = await db.collection("courses").doc(courseId).collection("quizzes").get();
  const quizzes = [];
  snap.forEach((d) => {
    const data = d.data();
    const ms = data.createdAt && typeof data.createdAt.toMillis === "function" ? data.createdAt.toMillis() : 0;
    quizzes.push({ title: data.title, count: Array.isArray(data.questions) ? data.questions.length : -1, ms });
  });
  quizzes.sort((a, b) => b.ms - a.ms); // newest first, mirroring the app's display order
  console.log(`  Quizzes in Firestore: ${quizzes.length} (display order, newest first)`);
  for (const q of quizzes) console.log(`    • ${q.title} | ${q.count} question(s)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const quizzes = loadQuizzes(args.file);

  if (args.listQuizzes) {
    printQuizList(countQuizzes(quizzes));
    return;
  }

  if (args.courses.length === 0) {
    console.error("✗ No target course. Pass --course <courseId> (repeatable), or use --list-quizzes.");
    process.exit(2);
  }

  // Quiz selection (exact trimmed title match).
  const quizCounts = countQuizzes(quizzes);
  let selected = quizzes;
  if (args.quizTitles.length > 0) {
    const wanted = new Set(args.quizTitles);
    const unknown = args.quizTitles.filter((t) => !quizCounts.has(t));
    if (unknown.length > 0) {
      console.error(`✗ Unknown quiz title(s): ${unknown.join(", ")}`);
      printQuizList(quizCounts);
      process.exit(2);
    }
    selected = quizzes.filter((q) => typeof q.title === "string" && wanted.has(q.title.trim()));
  }
  if (selected.length === 0) {
    console.error("✗ No quizzes matched the selection — nothing to do.");
    process.exit(2);
  }

  // Validate every quiz up-front (before touching Firestore).
  const valid = [];
  const invalid = [];
  selected.forEach((entry, index) => {
    const { quiz, errors } = validateQuiz(entry, index);
    if (errors.length > 0) invalid.push({ index, errors });
    else valid.push(quiz);
  });
  if (invalid.length > 0) {
    console.log(`⚠ ${invalid.length} invalid quiz(es) will be SKIPPED (never written):`);
    for (const { index, errors } of invalid.slice(0, 20)) {
      console.log(`  • entry #${index}: ${errors.slice(0, 5).join("; ")}`);
    }
    if (invalid.length > 20) console.log(`  … ${invalid.length - 20} more`);
  }

  // Deterministic doc ids + in-run dedupe (identical content imported once).
  const deduped = [];
  const seen = new Set();
  let inRunDupes = 0;
  for (const quiz of valid) {
    const id = quizDocId(quiz);
    if (seen.has(id)) {
      inRunDupes += 1;
      continue;
    }
    seen.add(id);
    deduped.push({ ...quiz, id });
  }
  if (inRunDupes > 0) console.log(`⚠ ${inRunDupes} duplicate quiz(es) within the selection — each will be imported once.`);

  const totalQuestions = deduped.reduce((n, q) => n + q.questions.length, 0);
  console.log(`\nSelected ${deduped.length} valid quiz(es) (${totalQuestions} question(s)) from ${args.file}`);
  if (args.quizTitles.length > 0) console.log(`Quiz filter: ${args.quizTitles.join(", ")}`);

  const app = initializeApp({ credential: resolveCredential(), ...(args.project ? { projectId: args.project } : {}) });
  const db = getFirestore();
  console.log(`Connected to Firebase project: ${args.project ?? app.options.projectId ?? "(default)"}`);

  // Reverse file order: quizzes are listed newest-first (createdAt desc), so
  // importing the file's last quiz first makes the file's first quiz appear
  // first in the app.
  const ordered = [...deduped].reverse();
  console.log("Import order: reverse file order (quizzes display newest-first).");

  // PLAN everything first — a missing/renamed course aborts before any write.
  const plans = [];
  for (const courseId of args.courses) {
    plans.push(await planCourse(db, courseId, ordered));
  }

  console.log(args.apply ? "\n=== APPLY — writing to Firestore ===" : "\n=== DRY RUN — no writes performed ===");
  for (const plan of plans) printPlan(plan, args.verbose);

  if (!args.apply) {
    console.log("\nDry-run complete. Re-run the same command with --apply to write these documents.");
    return;
  }

  for (const plan of plans) {
    if (plan.planned.length === 0) {
      console.log(`\nCourse ${plan.id}: nothing to write (all ${plan.skippedExisting} quiz(es) already imported).`);
      continue;
    }
    console.log(`\nWriting to course ${plan.id} — "${plan.title}"…`);
    await writePlanned(db, plan);
  }

  console.log("\n=== VERIFICATION — reading back from Firestore ===");
  for (const courseId of args.courses) {
    console.log(`Course ${courseId}:`);
    await verifyCourse(db, courseId);
  }

  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n✗ FAILED: ${err.message}`);
    process.exit(1);
  });




