#!/usr/bin/env node
/**
 * Generates public/downloads/cscs-exam-checklist.pdf - the lead-magnet PDF
 * unlocked by the enquiry form on the /checklist landing page.
 *
 * Dependency-free on purpose: it hand-assembles a valid PDF 1.4 file using the
 * standard Helvetica family (no font embedding), so it runs anywhere Node runs:
 *
 *   node scripts/generate-checklist-pdf.mjs
 *
 * Content lives in the CONTENT section below. Edit it, re-run the script, and
 * commit the regenerated PDF. All text must stay Latin-1 safe (no em dashes,
 * curly quotes, or emoji) because the content stream is encoded Latin-1.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "public", "downloads", "cscs-exam-checklist.pdf");

/* ------------------------------- layout ---------------------------------- */

const PAGE_W = 612; // US Letter, points
const PAGE_H = 792;
const MARGIN_X = 56;
const TOP = 64;
const BOTTOM = 64;
const CONTENT_W = PAGE_W - 2 * MARGIN_X;

/* Brand palette - mirrors the site theme (primary: hsl(0 84% 60%) ~ #EF4444) */
const RED = [0.937, 0.267, 0.267];
const DARK = [0.059, 0.09, 0.165]; // slate-900
const BODY = [0.278, 0.333, 0.412]; // slate-600
const MUTED = [0.392, 0.455, 0.545]; // slate-500
const BOX_BG = [0.973, 0.98, 0.988]; // slate-50
const BOX_BORDER = [0.886, 0.91, 0.941]; // slate-200
const CHECK_STROKE = [0.58, 0.639, 0.722]; // slate-400

/* --------------------- font metrics (AFM widths / 1000) ------------------- */

const W_HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const W_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];
const W_EXTRA = { "\u00e9": [556, 611] }; // Latin-1 extras keyed by char: [helv, bold]

function charWidth(ch, bold) {
  const code = ch.charCodeAt(0);
  if (code >= 32 && code <= 126) {
    const table = bold ? W_BOLD : W_HELV;
    return table[code - 32];
  }
  const extra = W_EXTRA[ch];
  return extra ? extra[bold ? 1 : 0] : 556;
}

/* --------------------------- text run wrapping ---------------------------- */
/* A "run" is { t: string, b: boolean }. Runs are concatenated and wrapped as
   one paragraph, so bold lead-ins can flow into regular text mid-sentence. */

function textWidth(str, fontName, size) {
  const bold = fontName === "F2";
  let w = 0;
  for (const ch of str) w += charWidth(ch, bold);
  return (w * size) / 1000;
}

function tokenize(runs) {
  const tokens = [];
  for (const run of runs) {
    for (const part of run.t.split(/(\s+)/)) {
      if (!part) continue;
      tokens.push({ t: part, b: !!run.b, space: /^\s+$/.test(part) });
    }
  }
  return tokens;
}

function wrapRuns(runs, size, maxWidth) {
  const tokens = tokenize(runs);
  const lines = [];
  let line = [];
  let w = 0;
  for (const tok of tokens) {
    const tw = textWidth(tok.t, tok.b ? "F2" : "F1", size);
    if (!tok.space && w + tw > maxWidth && line.length) {
      while (line.length && line[line.length - 1].space) line.pop();
      lines.push(line);
      line = tok.space ? [] : [tok];
      w = tok.space ? 0 : tw;
    } else {
      line.push(tok);
      w += tw;
    }
  }
  while (line.length && line[line.length - 1].space) line.pop();
  if (line.length) lines.push(line);
  return lines;
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const rg = (c) => `${c[0]} ${c[1]} ${c[2]} rg`;

/* ------------------------------ page builder ------------------------------ */

class Doc {
  constructor() {
    this.pages = [];
    this.cur = null;
    this.y = 0;
  }
  op(s) {
    this.cur.push(s);
  }
  newPage() {
    if (this.cur) this.pages.push(this.cur);
    this.cur = [];
    this.y = PAGE_H - TOP;
  }
  close() {
    if (this.cur) this.pages.push(this.cur);
    this.cur = null;
  }
}

function ensure(doc, h) {
  if (doc.y - h < BOTTOM) doc.newPage();
}

function drawTokensLine(doc, x, yBase, tokens, size, color) {
  doc.op(`BT ${rg(color)} 1 0 0 1 ${x.toFixed(2)} ${yBase.toFixed(2)} Tm`);
  for (const tok of tokens) {
    doc.op(`/${tok.b ? "F2" : "F1"} ${size} Tf (${esc(tok.t)}) Tj`);
  }
  doc.op("ET");
}

function para(doc, x, width, runs, { size = 10, color = BODY, leading = 14.5, gapAfter = 8 } = {}) {
  const lines = wrapRuns(runs, size, width);
  for (const line of lines) {
    ensure(doc, leading + gapAfter);
    drawTokensLine(doc, x, doc.y - size * 0.85, line, size, color);
    doc.y -= leading;
  }
  doc.y -= gapAfter;
}

function checkboxItem(doc, text, { size = 10, leading = 14, gap = 7 } = {}) {
  const xText = MARGIN_X + 26;
  const lines = wrapRuns([{ t: text, b: false }], size, CONTENT_W - 26);
  ensure(doc, lines.length * leading + gap + 2);
  doc.op(`${rg(CHECK_STROKE)} 1 w ${MARGIN_X + 1} ${(doc.y - 10.5).toFixed(2)} 10 10 re S`);
  for (const line of lines) {
    drawTokensLine(doc, xText, doc.y - size * 0.85, line, size, BODY);
    doc.y -= leading;
  }
  doc.y -= gap;
}

function sectionBar(doc, text) {
  ensure(doc, 46);
  doc.op(`${rg(RED)} ${MARGIN_X} ${(doc.y - 26).toFixed(2)} ${CONTENT_W} 26 re f`);
  doc.op(`BT 1 1 1 rg 1 0 0 1 ${MARGIN_X + 12} ${(doc.y - 26 + 8.5).toFixed(2)} Tm /F2 12.5 Tf (${esc(text)}) Tj ET`);
  doc.y -= 42;
}

function moduleHeader(doc, text) {
  ensure(doc, 30);
  doc.op(`BT ${rg(DARK)} 1 0 0 1 ${MARGIN_X} ${(doc.y - 11).toFixed(2)} Tm /F2 11.5 Tf (${esc(text)}) Tj ET`);
  doc.y -= 27;
}

function factBox(doc, title, paras) {
  const pad = 14, size = 9.5, leading = 13.5, gap = 6, titleH = 18;
  const wrapped = paras.map((p) => wrapRuns(p.runs, size, CONTENT_W - pad * 2 - 14));
  const h = pad * 2 + titleH + wrapped.reduce((a, lines) => a + lines.length * leading + gap, 0) - gap;
  ensure(doc, h + 10);
  const topY = doc.y;
  doc.op(`${rg(BOX_BG)} ${MARGIN_X} ${(topY - h).toFixed(2)} ${CONTENT_W} ${h.toFixed(2)} re f`);
  doc.op(`${rg(BOX_BORDER)} 1 w ${MARGIN_X} ${(topY - h).toFixed(2)} ${CONTENT_W} ${h.toFixed(2)} re S`);
  let y = topY - pad;
  doc.op(`BT ${rg(RED)} 1 0 0 1 ${MARGIN_X + pad} ${(y - 10).toFixed(2)} Tm /F2 10.5 Tf (${esc(title)}) Tj ET`);
  y -= titleH;
  for (const lines of wrapped) {
    doc.op(`${rg(RED)} ${(MARGIN_X + pad + 1).toFixed(2)} ${(y - size * 0.85 - 1).toFixed(2)} 2.5 2.5 re f`);
    for (const line of lines) {
      drawTokensLine(doc, MARGIN_X + pad + 10, y - size * 0.85, line, size, BODY);
      y -= leading;
    }
    y -= gap;
  }
  doc.y = topY - h - 18;
}

function ctaBox(doc, title, paras) {
  const pad = 18, size = 10.5, leading = 15, titleH = 22;
  const wrapped = paras.map((p) => wrapRuns(p.runs, size, CONTENT_W - pad * 2));
  const h = pad * 2 + titleH + wrapped.reduce((a, lines) => a + lines.length * leading + 5, 0) - 5;
  ensure(doc, h + 10);
  const topY = doc.y;
  doc.op(`${rg(RED)} ${MARGIN_X} ${(topY - h).toFixed(2)} ${CONTENT_W} ${h.toFixed(2)} re f`);
  let y = topY - pad;
  doc.op(`BT 1 1 1 rg 1 0 0 1 ${MARGIN_X + pad} ${(y - 13).toFixed(2)} Tm /F2 14 Tf (${esc(title)}) Tj ET`);
  y -= titleH;
  for (const lines of wrapped) {
    for (const line of lines) {
      drawTokensLine(doc, MARGIN_X + pad, y - size * 0.85, line, size, [1, 1, 1]);
      y -= leading;
    }
    y -= 5;
  }
  doc.y = topY - h - 16;
}

function drawFooters(doc, total) {
  const rule = `0.85 0.88 0.92 RG 0.7 w ${MARGIN_X} 54 m ${PAGE_W - MARGIN_X} 54 l S`;
  const left = `KIN\u00e9TIKA - CSCS Exam Prep Checklist`;
  doc.pages.forEach((ops, i) => {
    ops.push(rule);
    ops.push(`BT ${rg(MUTED)} 1 0 0 1 ${MARGIN_X} 40 Tm /F1 8 Tf (${esc(left)}) Tj ET`);
    const label = `Page ${i + 1} of ${total}`;
    const w = textWidth(label, "F1", 8);
    ops.push(`BT ${rg(MUTED)} 1 0 0 1 ${(PAGE_W - MARGIN_X - w).toFixed(2)} 40 Tm /F1 8 Tf (${esc(label)}) Tj ET`);
  });
}

/* --------------------------------- CONTENT --------------------------------- */

const PHASE1_ITEMS = [
  "Confirm your NSCA eligibility and register for the exam. Picking a target exam date is the single best way to create urgency and structure.",
  "Download the official NSCA Exam Content Outline (ECO) and keep it visible while you study - every session should map to a domain.",
  "Build a realistic weekly study schedule. Most successful candidates prepare consistently for 8 to 12 weeks.",
  "Enroll in a structured prep course so every study session has expert guidance instead of guesswork.",
  "Gather your study materials: the textbook, your notes, and one trusted practice question bank.",
  "Take a baseline practice test to identify your strongest and weakest domains before you start.",
  "Set up a distraction-free study space and block fixed study times in your calendar.",
  "Join a study community or recruit an accountability partner who is preparing for the same exam.",
];

const MODULES = [
  {
    title: "Module A - Scientific Foundations (Chapters 1-12)",
    chapters: [
      "Ch. 1: Structure and Function of Body Systems",
      "Ch. 2: Biomechanics of Resistance Exercise",
      "Ch. 3: Bioenergetics of Exercise and Training",
      "Ch. 4: Endocrine Responses to Resistance Exercise",
      "Ch. 5: Adaptations to Anaerobic Training",
      "Ch. 6: Adaptations to Aerobic Training",
      "Ch. 7: Age-Related Differences",
      "Ch. 8: Sex-Related Differences",
      "Ch. 9: Psychological Foundations of Performance",
      "Ch. 10: Basic Nutritional Factors",
      "Ch. 11: Nutrition Strategies for Performance",
      "Ch. 12: Performance-Enhancing Substances",
    ],
  },
  {
    title: "Module B - Exercise Technique (Chapters 15-17)",
    chapters: [
      "Ch. 15: Performance Preparation, Mobility, and Flexibility",
      "Ch. 16: Exercise Technique - Free Weights and Machines",
      "Ch. 17: Exercise Technique - Alternative Modes",
    ],
  },
  {
    title: "Module C - Program Design (Chapters 18-22)",
    chapters: [
      "Ch. 18: Program Design for Resistance Training",
      "Ch. 19: Plyometric Training",
      "Ch. 20: Speed and Agility Training",
      "Ch. 21: Aerobic Endurance and Metabolic Training",
      "Ch. 22: Periodization",
    ],
  },
  {
    title: "Module D - Organization & Administration (Chapters 23-26)",
    chapters: [
      "Ch. 23: Rehabilitation, Reconditioning, and Medical Issues",
      "Ch. 24: Overreaching, Overtraining, and Recovery",
      "Ch. 25: Facility Design, Layout, and Organization",
      "Ch. 26: Facility Policies, Procedures, and Legal Issues",
    ],
  },
  {
    title: "Module E - Testing & Evaluation (Chapters 13-14)",
    chapters: [
      "Ch. 13: Principles of Test Selection and Administration",
      "Ch. 14: Administration, Scoring, and Interpretation of Tests",
    ],
  },
];

const PHASE3_ITEMS = [
  "Complete the domain-specific quiz after finishing every chapter - do not move on until you score 80% or higher.",
  "Work through 150+ practice questions spread across all exam domains, not just your favorites.",
  "Simulate exam pace: roughly 55 seconds per question in Section 1 and 70 seconds per question in Section 2.",
  "Drill athlete case-study scenarios using a systematic needs-analysis framework.",
  "Drill research case-study scenarios - practice interpreting study designs and statistics.",
  "Practice video-based technique analysis: watch the entire clip before choosing your answer.",
  "Keep an error log. Revisit every missed question within 48 hours.",
  "Take a full-length mock exam two weeks out, and a second one one week out.",
];

const PHASE4_ITEMS = [
  "Final week: light review of your error log and weak domains only - no new material in the last 48 hours.",
  "Confirm your exam appointment, location, and required ID at least three days ahead.",
  "Plan your route and aim to arrive 30 minutes early.",
  "Sleep 7 to 8 hours the night before. Do not cram past midnight.",
  "Eat a familiar, balanced meal before the exam - nothing new on exam day.",
  "Read every question completely. Watch for words like NOT, EXCEPT, and BEST.",
  "Budget your time per section and flag hard questions so you can return to them later.",
  "For video-based items, watch the entire clip before answering.",
  "Never leave a question blank - an educated guess beats an empty box.",
  "Stay calm and trust your preparation. You have done the work.",
];

const FACT_PARAS = [
  {
    runs: [
      { t: "Section 1 - Scientific Foundations:  ", b: true },
      { t: "1.5 hours. 80 scored plus 15 pretest multiple-choice questions covering exercise sciences, exercise physiology, and nutrition.", b: false },
    ],
  },
  {
    runs: [
      { t: "Section 2 - Practical/Applied:  ", b: true },
      { t: "2.5 hours. 110 scored plus 15 pretest multiple-choice questions covering exercise technique, program design, organization/administration, and testing/evaluation - including video-supported technique items.", b: false },
    ],
  },
  {
    runs: [
      { t: "Eligibility:  ", b: true },
      { t: "The NSCA requires academic and practical experience credentials (typically a bachelor's degree in a related field). Confirm yours before registering.", b: false },
    ],
  },
  {
    runs: [
      { t: "Scope:  ", b: true },
      { t: "This checklist follows the domains of the NSCA Exam Content Outline (ECO) so nothing on the exam catches you by surprise.", b: false },
    ],
  },
];

const CTA_PARAS = [
  {
    runs: [
      { t: "The KIN\u00e9TIKA CSCS Prep Course gives you 30+ hours of chapter-by-chapter video lectures, 150+ practice questions, domain-aligned quizzes for every chapter, and proven case-study frameworks - with lifetime access and free updates.", b: false },
    ],
  },
  {
    runs: [
      { t: "Enroll on our website and turn this checklist into a done-for-you study plan.", b: true },
    ],
  },
];

const DISCLAIMER =
  "KIN\u00e9TIKA is an independent prep resource and is not affiliated with, endorsed by, or sponsored by the NSCA. " +
  "This checklist is aligned with the domains of the NSCA Exam Content Outline (ECO) and is intended for personal study planning.";

/* ------------------------------ PDF assembly ------------------------------ */

function buildPdf(pages) {
  const objects = []; // 1-indexed; objects[n] = body string of object n
  let next = 6; // 1 catalog, 2 pages, 3-5 fonts
  const pageObjNums = pages.map(() => next++);
  const streamObjNums = pages.map(() => next++);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [ ${pageObjNums.map((n) => `${n} 0 R`).join(" ")} ] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>";

  pages.forEach((ops, i) => {
    const content = ops.join("\n");
    objects[pageObjNums[i]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${streamObjNums[i]} 0 R >>`;
    objects[streamObjNums[i]] =
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  let out = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n";
  const total = objects.length - 1;
  const offsets = [];
  for (let n = 1; n <= total; n++) {
    offsets[n] = Buffer.byteLength(out, "latin1");
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= total; n++) {
    out += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/* ------------------------------ page layout ------------------------------- */

function buildDocument() {
  const doc = new Doc();
  doc.newPage();

  /* Page 1 - brand, title, exam facts, phase 1 */
  doc.op(`BT ${rg(RED)} 1 0 0 1 ${MARGIN_X} ${(doc.y - 9).toFixed(2)} Tm /F2 9 Tf (KIN\u00e9TIKA - CSCS EXAM PREP) Tj ET`);
  doc.y -= 30;
  para(doc, MARGIN_X, CONTENT_W, [{ t: "The Complete CSCS Exam Prep Checklist", b: true }], {
    size: 25, color: DARK, leading: 30, gapAfter: 4,
  });
  doc.op(`${rg(RED)} ${MARGIN_X} ${(doc.y + 6).toFixed(2)} 64 2.5 re f`);
  doc.y -= 16;
  para(doc, MARGIN_X, CONTENT_W, [
    { t: "A step-by-step companion to structure your preparation - from your first study session to exam day. Print it, tick it, and walk into the exam with total confidence.", b: false },
  ], { size: 11, color: BODY, leading: 16, gapAfter: 18 });
  factBox(doc, "KNOW THE EXAM BEFORE YOU START", FACT_PARAS);
  sectionBar(doc, "PHASE 1 - SET UP FOR SUCCESS");
  for (const item of PHASE1_ITEMS) checkboxItem(doc, item);

  /* Page 2 - phase 2, modules A + B */
  doc.newPage();
  sectionBar(doc, "PHASE 2 - MASTER THE CONTENT, CHAPTER BY CHAPTER");
  para(doc, MARGIN_X, CONTENT_W, [
    { t: "Your per-chapter routine: ", b: true },
    { t: "watch the lecture, take the domain quiz, log every mistake, and re-test yourself after 48 hours. Tick a chapter only when you can explain its key concepts out loud.", b: false },
  ], { size: 10, color: BODY, leading: 14, gapAfter: 12 });
  for (const mod of MODULES.slice(0, 2)) {
    moduleHeader(doc, mod.title);
    for (const ch of mod.chapters) checkboxItem(doc, ch, { gap: 5.5 });
  }

  /* Page 3 - modules C, D, E */
  doc.newPage();
  for (const mod of MODULES.slice(2)) {
    moduleHeader(doc, mod.title);
    for (const ch of mod.chapters) checkboxItem(doc, ch, { gap: 5.5 });
    doc.y -= 8;
  }
  para(doc, MARGIN_X, CONTENT_W, [
    { t: "Milestone: ", b: true },
    { t: "all 26 chapters ticked. Move on to timed practice only when every module quiz sits at 80% or higher.", b: false },
  ], { size: 10, color: BODY, leading: 14, gapAfter: 0 });

  /* Page 4 - phase 3 */
  doc.newPage();
  sectionBar(doc, "PHASE 3 - PRACTICE & ASSESS");
  for (const item of PHASE3_ITEMS) checkboxItem(doc, item);

  /* Page 5 - phase 4, CTA, disclaimer */
  doc.newPage();
  sectionBar(doc, "PHASE 4 - FINAL WEEK & EXAM DAY");
  for (const item of PHASE4_ITEMS) checkboxItem(doc, item);
  doc.y -= 6;
  ctaBox(doc, "NEED MORE STRUCTURE?", CTA_PARAS);
  para(doc, MARGIN_X, CONTENT_W, [{ t: DISCLAIMER, b: false }], {
    size: 7.5, color: MUTED, leading: 10, gapAfter: 0,
  });

  doc.close();
  return doc.pages;
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
const pages = buildDocument();
drawFooters({ pages }, pages.length);
writeFileSync(OUT_PATH, buildPdf(pages));
console.log(`Generated ${pages.length} pages -> ${OUT_PATH}`);



