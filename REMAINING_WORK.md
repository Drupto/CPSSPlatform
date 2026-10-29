# KINÉTIKA — Remaining Work Index

> **Purpose:** one page that points at every outstanding task across the repo, so nothing lives only in a stale report.
> **This file is an index, not a plan.** The detailed plans stay where they are (§1). Update the status column here when something closes.
> **Created:** 2026-10-23 · **Last updated:** 2026-10-29 · **HEAD:** `6c2a4b0` (branch `FirebaseIntegration`) · **Status legend:** ✅ done · ◐ partial · ⬜ open · ⚠️ accepted risk

---

## 1. Where the real plans live

| Doc | Scope | Status | Notes |
|---|---|---|---|
| `PHASE2_IMPLEMENTATION_PLAN.md` (root) | **Product Phase 2** — Brevo email, referrals, CRM, certificates, invoices/refunds, notifications | ⬜ Not started, blocked on client decisions (§3 D1–D9) | Freshest doc (2026-10-23), verified against current code |
| `docs/DPDP_COMPLIANCE_PLAN.md` | **India DPDP Act compliance** — 16 gaps, 7 phases, retention schedule, breach runbook, copy templates | ⬜ 0 of 7 phases implemented | Verified: no `consents`/`grievances`/`erasureRequests` in `firestore.rules`, no `src/app/grievance` page. Statutory deadline **13 May 2027**; Consent Managers **13 Nov 2026** |
| `SECURITY_AUDIT.md` (root) | Security findings C1–C3, H1–H7, M1–M6, L1–L5 | ◐ 17 of 22 resolved; 1 open, 1 deferred-CRITICAL | Written 2026-08-01, re-verified 2026-08-31 @ `c4a3265` → **stale vs HEAD `6c2a4b0`**; see `docs/SECURITY_REMEDIATION_PLAN.md` for the step-by-step remediation plan |
| `docs/SECURITY_REMEDIATION_PLAN.md` (root) | **Security remediation plan** — R0–R8 step-by-step implementation (key rotation, password policy, admin 2FA, deps, App Check, API key restriction, PITR, hygiene, deploy sequence) | ⬜ Not started | Created 2026-10-29 @ HEAD `6c2a4b0`; supersedes open findings in `SECURITY_AUDIT.md` |
| `docs/PRODUCTION_READINESS.md` | Build, deploy config, security summary, deps, code gates, SEO | ◐ Build/TS/SEO green; deploy + CI gaps | Same 2026-08-31 date — re-verify before quoting |
| `docs/SEO.md` | What SEO infrastructure exists + post-deploy checklist | ✅ Code complete, ⬜ 4 manual steps | Manual steps listed in §4 below |
| `docs/task-progress.md` | Historical feature checklist (all Phase 1 items ✅) | ✅ Complete | Points at the two reports above for the open items |

Read-only / historical (safe to ignore when resuming): `docs/blueprint.md` (original design brief, app was called "CSCS ProPass"), `docs/quiz-*.md`, `docs/creating-quizzes.md`, `FIREBASE_SETUP.md`, `ADMIN_ANALYTICS_EXPLANATION.md`, `DEBUG_VIDEO_UPLOAD.md`, and the four one-shot implementation summaries (`FINAL_*`, `FUNCTIONS_IMPLEMENTATION_SUMMARY.md`, `IMPLEMENTATION_COMPLETED.md`).

---

## 2. Launch blockers (P0 — must close before go-live)

| # | Task | Evidence | Effort |
|---|---|---|---|
| B1 | Run `node scripts/sync-admin-claims.mjs` — grants the `admin` custom claim the Edge middleware checks. **Without it every admin is locked out of `/admin/**`** (fail-closed by design). Re-run after each admin promotion; admins must sign out/in. | `src/middleware.ts` exists; script exists; item still ⬜ in readiness doc | S |
| B2 | Deploy `cors.json` to the bucket: `gsutil cors set cors.json gs://cscs-prep-2c063.firebasestorage.app`. File already contains `learnkinetika.com` + `www`; the bucket does not. | `cors.json` present & edited; deploy pending | S |
| B3 | Confirm which host serves `learnkinetika.com` — Netlify (README documents it) or Firebase App Hosting (`apphosting.yaml` also present). Then delete the losing target's config and align README. | `netlify.toml` + `apphosting.yaml` both tracked; README only explains Netlify | S |
| B4 | Deploy infra: `firebase deploy --only firestore:rules,storage:rules,firestore:indexes,functions`. Note `functions/` pins **Node 22**. | `functions/package.json` engine; `firestore.indexes.json` present | S |
| B5 | Firebase console → restrict the web API key by HTTP referrer to the production domains (audit **L1**). | `SECURITY_AUDIT.md` L1 | S |
| B6 | Confirm `GOOGLE_APPLICATION_CREDENTIALS_JSON` / discrete `FIREBASE_ADMIN_*` vars exist in the hosting runtime, or that App Hosting/Cloud Run ADC covers it. Sitemap + course metadata depend on it. | `.env.example` documents 3 resolution paths | S |
| B7 | Verify the email-verification link domain in Firebase Auth settings points at the production domain; test signup → verify → login on prod. | Go-live checklist item | S |
| B8 | **Rotate & relocate service-account private key** — live `FIREBASE_ADMIN_PRIVATE_KEY` in `.env` (new CRITICAL finding, 2026-10-29). Deferred by owner; must complete before go-live. | `.env` line 19; `.gitignore` covers but key is on disk | S |

---

## 3. Hardening backlog (P1–P3 — not blocking, still owed)

| # | Task | Severity | State |
|---|---|---|---|
| H3 | Scope Storage reads to enrolled users, **or** keep the accepted-risk note. Covers must stay publicly readable and `getDownloadURL` tokens bypass rules; real fix = signed URLs or a Function proxy | 🟠 High | ⚠️ Accepted & documented — revisit only if content leaks matter |
| H7 | AI demo flow — **closed**: `src/ai/` removed entirely; no public AI attack surface remains | 🟠 High | ✅ Closed (2026-10-29 — AI flow removed from codebase) |
| L5 | Enable **App Check** (reCAPTCHA v3 web + enforce on Functions/Firestore/Storage). Also closes H7's residual abuse exposure | 🔵 Low | ⬜ Open (console work) |
| — | `npm audit` — root prod advisories 62 (0 critical, 10 high, mostly `sharp`/`libvips` via Genkit + `teeny-request`); `functions/` 9 moderate. Re-run `npm audit --omit=dev --audit-level=high`; upgrades need breaking changes | 🟡 | ⬜ Recurring |
| — | Add **Dependabot/Renovate** + a CI job running `tsc --noEmit`, `next build`, `npm audit --audit-level=high`. There is **no `.github/`** and no test framework at all | 🟡 | ⬜ Open |
| — | First automated tests: Firestore rules tests (emulator) + callable-function tests. Phase 2 §15 assumes an emulator harness that does not exist yet — **build it during F0** | 🟡 | ⬜ Open |
| — | Remove `localhost` origins from `cors.json` at go-live (audit L3) once dev URLs are settled | 🔵 Low | ⬜ After B2 |
| — | Repo hygiene: `git rm -r --cached functions/lib` + gitignore entry; remove tracked junk `y`, `.modified`, `src/app/favicon.ico:Zone.Identifier`; rebrand `functions/.env.example` (DruptoLMS/Razorpay remnants) | 🟡 Medium | ⬜ Open (R7 in remediation plan) |

---

## 4. SEO — 4 manual steps left (code is done)

| # | Task | Evidence |
|---|---|---|
| S1 | Replace the `google-site-verification` placeholder with the real token after registering in Search Console | `src/app/layout.tsx:76-77` still `'GOOGLE_SITE_VERIFICATION_TOKEN'` |
| S2 | Submit `https://learnkinetika.com/sitemap.xml` | `src/app/sitemap.ts` is live and dynamic |
| S3 | Add real icon assets — `public/` has only `icon.svg`, `logo.png`, `QR_Local_Payment.jpeg`. `src/app/manifest.ts` references `/apple-icon.png` (180×180), `/icon-192.png` and `/icon-512.png`, none of which exist → the manifest currently 404s on install | `public/` listing vs `src/app/manifest.ts` |
| S4 | Replace the placeholder social profiles in `sameAs` with real accounts | `src/lib/seo.ts:176-179` (`youtube.com/@kinetika`, `linkedin.com/company/kinetika`) |

Already correct: support email `contact@learnkinetika.com` (`seo.ts:54`), `NEXT_PUBLIC_SITE_URL`, canonical/OG/Twitter/JSON-LD, noindex layouts, robots disallow rules.

---

## 5. DPDP compliance — 16 gaps, 0 implemented

Full detail in `docs/DPDP_COMPLIANCE_PLAN.md` (7 phases, file-by-file map in §6, ready-to-paste copy in Appendix D). Current state, verified against code today:

| Gap | Hard deadline | Code status |
|---|---|---|
| Itemized standalone privacy notice + withdrawal/rights/Board links | 13 May 2027 | ❌ `/privacy-policy` is generic; no consent/rights/Board links |
| Recorded, unbundled consent + easy withdrawal | 13 May 2027 | ❌ Bundled into ToS checkbox; no `consents` collection |
| Erasure + **48-hour pre-erasure notice** | 13 May 2027 | ❌ No `erasureRequests`, no deletion flow (use `onCourseDelete` as the template) |
| Access / summary of processing | 13 May 2027 | ❌ Absent |
| Correction of email (name only today) | 13 May 2027 | ◐ Partial |
| Grievance Officer + response window + form | 13 May 2027 | ❌ No `/grievance` page, no `grievances` collection |
| Nomination | 13 May 2027 | ❌ Absent |
| Breach runbook (Board report within 72h) | 13 May 2027 | ❌ Documented in Appendix B only — no operational process |
| Retention schedule enforcement | 13 May 2027 | ❌ Appendix A only |
| Children <18: age gate, no tracking, parental consent | 13 May 2027 | ❌ No age attestation |
| Processor disclosure in notice | 13 May 2027 | ❌ Undisclosed |
| Consent Manager interoperability | **13 Nov 2026** | ❌ Not designed |

**Sequencing note:** Phase 2 F0 already proposes Brevo as the email provider. DPDP Phase 1/3 need transactional email (notice, erasure notice, grievance acks) — so **build F0 first, then DPDP Phases 1–3**. DPDP §8.4 asks the same provider question; answer it once.

---

## 6. Product Phase 2 — not started

Everything is in `PHASE2_IMPLEMENTATION_PLAN.md`. Nothing to add here except the dependency chain:

1. **Blocked on the client:** decisions D1–D9 (discount %, commission %, auto-approve referrals, min payout, GST-registered or not, DnD library, refund window) + package choice. §3 lists a recommended default for every one.
2. **Then:** Phase 0 (Brevo domain + SPF/DKIM/DMARC, install `pdf-lib`/`qrcode`, env vars, seed `appSettings/commissions` + `appSettings/billing`) → F0 → F1 → F5 → F2 → F4 → F3.
3. **Highest-risk edit in the whole engagement:** `firestore.rules:219` + `:258` — the enrollment create/update whitelist. Run the 5-case rule test in §9.5 before deploying.

---

## 7. Repo hygiene (cheap, do anytime)

| Item | Detail |
|---|---|
| Tracked junk files | `y` (911 B, a dump of the *default* Firebase Storage rules — not used by the build) and `.modified` (0 B) are **committed**. `git rm y .modified`. |
| Build artifact present | `tsconfig.tsbuildinfo` is in the working tree but correctly gitignored; delete it if `tsc --noEmit` reports phantom `src/app/super/*` errors (readiness doc §1). |
| Root doc sprawl | 11 markdown files at root (after adding this one), 4 of them one-shot "implementation complete" notes. Move `SECURITY_AUDIT.md` / `docs/PRODUCTION_READINESS.md` into `docs/`, and `PHASE2_IMPLEMENTATION_PLAN.md` + this file into `docs/planning/`; keep only `README.md` at root. |
| Stale reports | `SECURITY_AUDIT.md` and `docs/PRODUCTION_READINESS.md` are dated 2026-08-31 @ `c4a3265`. Re-run build + `npm audit` and bump the dates before showing them to a client. |
| `.env.example` | ✅ Already cleaned — no Razorpay/DruptoLMS remnants left (older reports say otherwise). |
| README | Documents Netlify only, while `apphosting.yaml` also exists → resolve with B3. |

---

## 8. Blind spots — nothing in the repo covers these

Not bugs; just things no existing doc owns. Listed so they don't get discovered by a user instead of by us.

| Area | Gap | Why it matters |
|---|---|---|
| **Monitoring** | No error tracking (Sentry or equivalent), no uptime check, no Firebase budget alert, no alerting on Cloud Function failures | a silent email/trigger failure in Phase 2 is invisible today |
| **Backups / DR** | No Firestore scheduled export, no restore drill, no documented RPO/RTO | one bad admin action or a bad rules deploy with no rollback plan |
| **Payments ops** | UPI verification is manual and admin-driven; no daily reconciliation, no duplicate-UTR detection, no refund ledger until F4 | money errors surface as support tickets |
| **Analytics** | No GA4 / event tracking — so no funnel data for referrals or abandoned payments (F2 CRM partially fills this) | can't measure whether Phase 2 features pay for themselves |
| **Performance budget** | No Lighthouse/CWV baseline or CI check; `/admin/resources` is 293 kB first-load JS | SEO gains can be lost to CWV regressions |
| **Accessibility** | No a11y audit; Phase 2 adds forms, dialogs and a partner dashboard | public-sector/NGO buyers commonly ask |
| **Legal copy** | Refund/cancellation policy, grievance officer details, GST invoice format, referral T&C text — all need a human decision, not code | F1/F4 accept-criteria assume these exist |
| **Load / abuse** | No rate limits beyond rules; AI demo is public (H7) | cost shock on a viral post |
| **i18n** | English + Hindi (Devanagari) not supported → affects F3 certificate fonts (`pdf-lib`) and any marketing copy | decide before F3, not during |
| **Mobile app** | Out of scope everywhere; `/manifest.ts` is PWA-ready but offline support is untested | set expectations in the quote |

---

## 9. Suggested execution order

1. **Now (½ day):** B1–B7 launch blockers + B8 key rotation (owner action) → then S1–S4 SEO steps (they're all console/CLI, no code).
2. **Security remediation plan:** work through `docs/SECURITY_REMEDIATION_PLAN.md` R1–R8 in order (R0 key rotation deferred by owner but remains a go-live blocker).
2. **Before Phase 2 code:** repo hygiene §7 (`git rm y .modified`) + Firebase emulator test harness + CI job (needed by Phase 2 §15 anyway).
3. **Client answers D1–D9** → Phase 2 Phase 0 → F0 (Brevo) → F1 → F5 → F2 → F4 → F3.
4. **Interleave:** DPDP Phases 1–3 right after F0 (they reuse the same email provider), Phase 4–7 before 13 May 2027.
5. **Ongoing:** App Check (L5), Dependabot, quarterly `npm audit` + rules review.

---

## 10. Verification snapshot (2026-10-23)

Checked directly in the working tree, not copied from reports:

- `src/middleware.ts`, `scripts/sync-admin-claims.mjs`, `cors.json`, `apphosting.yaml`, `netlify.toml`, `firestore.indexes.json` — all present.
- `.github/` — absent → no CI. `functions/package.json` → `"node": "22"`.
- `firestore.rules` — no `consents`, `grievances`, `erasureRequests`, `dataRequests` matches → DPDP untouched.
- `src/app/` — no `grievance` directory; route segments are `admin, auth, checklist, courses, dashboard, lib, privacy-policy, terms-of-service`.
- `src/app/layout.tsx:76-77` — verification token still a placeholder; `src/lib/seo.ts:176-179` — placeholder socials.
- `public/` — `icon.svg`, `logo.png`, `QR_Local_Payment.jpeg` only.
- `.env.example` — clean, documents all three Admin-SDK credential paths.
- `.env` — **contains live `FIREBASE_ADMIN_PRIVATE_KEY` (new CRITICAL finding, 2026-10-29)**; gitignored & never committed, but must be rotated/relocated before go-live (R0 in remediation plan).
- `git ls-files y .modified` — both tracked (junk). `tsconfig.tsbuildinfo` tracked? **No** — gitignored.
- HEAD `6c2a4b0` vs audit baseline `c4a3265` → both reports predate current code; new findings documented in `docs/SECURITY_REMEDIATION_PLAN.md`.

