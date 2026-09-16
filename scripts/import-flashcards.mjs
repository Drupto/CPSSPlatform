#!/usr/bin/env node
/**
 * Chunked flashcard importer for course resources.
 *
 * Imports flashcards from a JSON file into the Firestore subcollections
 * `courses/{courseId}/resources` as `type: "flashcard"` documents — the same
 * shape the app writes via buildResourcePayload() in src/lib/course.ts and
 * that firestore.rules validates via isValidContentData().
 *
 * SAFETY MODEL:
 *  - DRY-RUN BY DEFAULT: nothing is written unless --apply is passed.
 *  - Additive only: creates new documents; never deletes, updates, or
 *    renumbers existing resources.
 *  - Idempotent: deterministic doc IDs (SHA-256 of deck+front+back) —
 *    re-running skips cards that already exist, so interrupted imports can
 *    be retried safely without duplicates.
 *  - Ordering: appends after the course's current max numeric `order`
 *    (0 for an empty course). `order` is always an int >= 0 — missing or
 *    non-numeric order values are invisible to orderBy("order") queries.
 *  - Batched writes: 450 ops per batch (Firestore's hard limit is 500).
 *  - Every card is validated up-front against the same constraints as
 *    isValidContentData() in firestore.rules; invalid cards are reported
 *    and skipped, never written.
 *  - Credentials: firebase-admin (server-side) via the standard ADC chain,
 *    exactly like scripts/backfill-flashcards.mjs.
 *
 * Usage:
 *   # List decks in the data file (no credentials needed)
 *   node scripts/import-flashcards.mjs --list-decks
 *
 *   # Dry-run (default): print the write plan for one deck, both courses
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/import-flashcards.mjs \
 *     --file cscs_flashcards.json \
 *     --deck "Exercise Science" \
 *     --course EEOu2lW9W2q7BIXVq7EC \
 *     --course J69eKSRjQmulK1oNpfFP
 *
 *   # Write for real: same command with --apply
 *   # See every planned card in the report: add --verbose
 *
 * Flags:
 *   --file <path>     data file (default: <repo root>/cscs_flashcards.json)
 *   --deck <name>     import only these decks (repeatable; default: all decks)
 *   --course <id>     target course (repeatable, required unless --list-decks)
 *   --project <id>    override Firebase project id
 *   --list-decks      show deck names + card counts, then exit
 *   --verbose         list every planned card in the dry-run report
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
const DEFAULT_FILE = resolve(REPO_ROOT, "cscs_flashcards.json");
const BATCH_SIZE = 450; // Firestore's hard cap is 500 writes per batch

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    apply: false,
    file: DEFAULT_FILE,
    decks: [],
    courses: [],
    project: undefined,
    listDecks: false,
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
      case "--deck": args.decks.push(nextValue()); break;
      case "--course": args.courses.push(nextValue()); break;
      case "--project": args.project = nextValue(); break;
      case "--list-decks": args.listDecks = true; break;
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

function groupByDeck(planned) {
  const map = new Map();
  for (const card of planned) {
    if (!map.has(card.deck)) map.set(card.deck, { count: 0, min: Infinity, max: -Infinity });
    const g = map.get(card.deck);
    g.count += 1;
    g.min = Math.min(g.min, card.order);
    g.max = Math.max(g.max, card.order);
  }
  return map;
}

function previewCard(card) {
  return `    [order ${card.order}] ${card.deck} | ${truncate(card.front, 70)} => ${truncate(card.back, 60)}`;
}

// ---------------------------------------------------------------------------
// Data file loading + validation (mirrors isValidContentData in firestore.rules)
// ---------------------------------------------------------------------------

function loadCards(file) {
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
    console.error(`✗ Data file must be a JSON array of {title, front, back} objects.`);
    process.exit(1);
  }
  return data;
}

function countDecks(cards) {
  const counts = new Map();
  for (const entry of cards) {
    const deck = typeof entry.title === "string" ? entry.title.trim() : "(no title)";
    counts.set(deck, (counts.get(deck) ?? 0) + 1);
  }
  return counts;
}

function printDeckList(counts) {
  console.log("Decks available in the data file:");
  for (const [deck, count] of counts) console.log(`  • ${deck}: ${count} card(s)`);
}

/**
 * Same constraints as isValidContentData() in firestore.rules: title is a
 * 1..200 char string; front/back are 1..5000 char strings. body/url are
 * always written as "" for flashcards (mirrors buildResourcePayload() in
 * src/lib/course.ts). Extra fields in the source entry are ignored (the
 * payload is whitelisted) but reported so nothing silently disappears.
 */
function validateCard(entry, index) {
  const errors = [];
  const title = typeof entry.title === "string" ? entry.title.trim() : null;
  const front = typeof entry.front === "string" ? entry.front.trim() : null;
  const back = typeof entry.back === "string" ? entry.back.trim() : null;

  if (title === null) errors.push("title is not a string");
  else if (title.length === 0) errors.push("title is empty");
  else if (title.length > 200) errors.push(`title exceeds 200 chars (${title.length})`);

  if (front === null) errors.push("front is not a string");
  else if (front.length === 0) errors.push("front is empty");
  else if (front.length > 5000) errors.push(`front exceeds 5000 chars (${front.length})`);

  if (back === null) errors.push("back is not a string");
  else if (back.length === 0) errors.push("back is empty");
  else if (back.length > 5000) errors.push(`back exceeds 5000 chars (${back.length})`);

  const extra = Object.keys(entry).filter((k) => !["title", "front", "back"].includes(k));
  if (extra.length > 0) errors.push(`unexpected field(s) ignored: ${extra.join(", ")}`);

  return { title, front, back, errors };
}

/** Deterministic document id → safe re-runs without duplicates. */
function docIdFor(title, front, back) {
  return createHash("sha256").update(`${title}\u0000${front}\u0000${back}`, "utf8").digest("hex");
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
// Firestore planning / writing / verification
// ---------------------------------------------------------------------------

async function planCourse(db, courseId, cards) {
  const courseRef = db.collection("courses").doc(courseId);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) {
    throw new Error(`Course "${courseId}" does not exist — aborting before any writes`);
  }
  const courseData = courseSnap.data() ?? {};
  const resSnap = await courseRef.collection("resources").get();

  const existingIds = new Set();
  let maxOrder = -1;
  resSnap.forEach((d) => {
    existingIds.add(d.id);
    const o = d.data().order;
    if (typeof o === "number" && Number.isInteger(o) && o >= 0 && o > maxOrder) maxOrder = o;
  });

  // Append new cards after the current max order; existing docs are untouched.
  let nextOrder = maxOrder + 1;
  const planned = [];
  let skippedExisting = 0;
  for (const card of cards) {
    if (existingIds.has(card.id)) {
      skippedExisting += 1;
      continue;
    }
    planned.push({ ...card, order: nextOrder });
    nextOrder += 1;
  }

  return {
    id: courseId,
    title: courseData.title ?? "(untitled)",
    published: courseData.published === true,
    existingResources: resSnap.size,
    maxOrder,
    planned,
    skippedExisting,
  };
}

function printPlan(course, verbose) {
  console.log(`\nCourse ${course.id} — "${course.title}" (published: ${course.published})`);
  console.log(`  Existing resources: ${course.existingResources} | current max order: ${course.maxOrder < 0 ? "none" : course.maxOrder}`);
  console.log(`  Cards to create: ${course.planned.length} | already imported (will skip): ${course.skippedExisting}`);
  if (course.planned.length > 0) {
    console.log(`  Order range to write: ${course.planned[0].order}–${course.planned[course.planned.length - 1].order}`);
    for (const [deck, g] of groupByDeck(course.planned)) {
      console.log(`    • ${deck}: ${g.count} card(s), orders ${g.min}–${g.max}`);
    }
    console.log(`  ${verbose ? "All planned cards:" : "Sample (first 3):"}`);
    const shown = verbose ? course.planned : course.planned.slice(0, 3);
    for (const c of shown) console.log(previewCard(c));
    if (!verbose && course.planned.length > 3) {
      console.log(`    … ${course.planned.length - 3} more (use --verbose to list all)`);
    }
  }
}

async function writePlanned(db, course) {
  const courseRef = db.collection("courses").doc(course.id);
  const batches = Math.ceil(course.planned.length / BATCH_SIZE);
  let written = 0;
  for (let start = 0; start < course.planned.length; start += BATCH_SIZE) {
    const slice = course.planned.slice(start, start + BATCH_SIZE);
    const batch = db.batch();
    for (const card of slice) {
      batch.set(courseRef.collection("resources").doc(card.id), {
        type: "flashcard",
        title: card.title,
        body: "",
        url: "",
        order: card.order,
        front: card.front,
        back: card.back,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    const batchNo = Math.floor(start / BATCH_SIZE) + 1;
    try {
      await batch.commit();
    } catch (err) {
      console.error(`  ✗ Batch ${batchNo}/${batches} failed after ${written} doc(s): ${err.message}`);
      console.error(`    Safe to re-run the same command: already-written cards are skipped by id, so only the remainder is written.`);
      throw err;
    }
    written += slice.length;
    console.log(`  ✓ Batch ${batchNo}/${batches}: wrote ${slice.length} doc(s) (${written}/${course.planned.length})`);
  }
  return written;
}

async function verifyCourse(db, courseId) {
  const snap = await db.collection("courses").doc(courseId).collection("resources").get();
  const cards = [];
  let other = 0;
  snap.forEach((d) => {
    const data = d.data();
    if (data.type === "flashcard") {
      cards.push({ id: d.id, order: data.order, title: data.title, front: data.front, back: data.back });
    } else {
      other += 1;
    }
  });
  cards.sort((a, b) => (a.order ?? -1) - (b.order ?? -1));
  console.log(`  Flashcards in Firestore: ${cards.length}${other > 0 ? ` (plus ${other} non-flashcard resource(s))` : ""}`);
  if (cards.length > 0) {
    const first = cards[0];
    const last = cards[cards.length - 1];
    console.log(`  First: [order ${first.order}] ${first.title} | ${truncate(first.front, 60)}`);
    console.log(`  Last:  [order ${last.order}] ${last.title} | ${truncate(last.front, 60)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cards = loadCards(args.file);

  if (args.listDecks) {
    printDeckList(countDecks(cards));
    return;
  }

  if (args.courses.length === 0) {
    console.error("✗ No target course. Pass --course <courseId> (repeatable), or use --list-decks.");
    process.exit(2);
  }

  // Deck selection (exact name match).
  const deckCounts = countDecks(cards);
  let selected = cards;
  if (args.decks.length > 0) {
    const wanted = new Set(args.decks);
    const unknown = args.decks.filter((d) => !deckCounts.has(d));
    if (unknown.length > 0) {
      console.error(`✗ Unknown deck name(s): ${unknown.join(", ")}`);
      printDeckList(deckCounts);
      process.exit(2);
    }
    selected = cards.filter((c) => typeof c.title === "string" && wanted.has(c.title.trim()));
  }
  if (selected.length === 0) {
    console.error("✗ No cards matched the selection — nothing to do.");
    process.exit(2);
  }

  // Validate every card up-front (before touching Firestore).
  const valid = [];
  const invalid = [];
  selected.forEach((entry, index) => {
    const { title, front, back, errors } = validateCard(entry, index);
    if (errors.length > 0) invalid.push({ index, errors });
    else valid.push({ deck: title, title, front, back });
  });
  if (invalid.length > 0) {
    console.log(`⚠ ${invalid.length} invalid card(s) will be SKIPPED (never written):`);
    for (const { index, errors } of invalid.slice(0, 20)) {
      console.log(`  • entry #${index}: ${errors.join("; ")}`);
    }
    if (invalid.length > 20) console.log(`  … ${invalid.length - 20} more`);
  }

  // In-run dedupe: identical content appearing twice is imported once.
  const deduped = [];
  const seen = new Set();
  let inRunDupes = 0;
  for (const card of valid) {
    const id = docIdFor(card.title, card.front, card.back);
    if (seen.has(id)) {
      inRunDupes += 1;
      continue;
    }
    seen.add(id);
    deduped.push({ ...card, id });
  }
  if (inRunDupes > 0) console.log(`⚠ ${inRunDupes} duplicate card(s) within the selection — each will be imported once.`);

  console.log(`\nSelected ${deduped.length} valid card(s) from ${args.file}`);
  if (args.decks.length > 0) console.log(`Deck filter: ${args.decks.join(", ")}`);

  const app = initializeApp({ credential: resolveCredential(), ...(args.project ? { projectId: args.project } : {}) });
  const db = getFirestore();
  console.log(`Connected to Firebase project: ${args.project ?? app.options.projectId ?? "(default)"}`);

  // PLAN everything first — a missing/renamed course aborts before any write.
  const plans = [];
  for (const courseId of args.courses) {
    plans.push(await planCourse(db, courseId, deduped));
  }

  console.log(args.apply ? "\n=== APPLY — writing to Firestore ===" : "\n=== DRY RUN — no writes performed ===");
  for (const plan of plans) printPlan(plan, args.verbose);

  if (!args.apply) {
    console.log("\nDry-run complete. Re-run the same command with --apply to write these documents.");
    return;
  }

  for (const plan of plans) {
    if (plan.planned.length === 0) {
      console.log(`\nCourse ${plan.id}: nothing to write (all ${plan.skippedExisting} card(s) already imported).`);
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




