# 🔒 Security Remediation Plan — CPSSPlatform (KINÉTIKA / CSCS Prep)

**Created:** 2026-10-29 · **HEAD:** `6c2a4b0` (branch `FirebaseIntegration`) · **Status:** ⬜ not started  
**Supersedes:** open findings in `SECURITY_AUDIT.md` (baseline 2026-08-01 / 2026-08-31 @ `c4a3265`)  
**Owner note:** service-account key rotation (R0) is deferred by you and excluded from this pass — it remains a **go-live blocker**.

Status legend: ⬜ open · ⏳ in-progress · ✅ done · ⚠️ blocked/deferred

---

## R0 (deferred by owner) — Rotate & relocate service-account private key ⚠️

| # | Step | Detail | Effort |
|---|------|--------|--------|
| R0-1 | Rotate the key in GCP | IAM & Admin → Service Accounts → `netlify-runtime@cscs-prep-2c063.iam.gserviceaccount.com` → delete the compromised key, create a new JSON key. | S |
| R0-2 | Move key outside the repo | Store the new key file at `~/.secrets/cscs-prep-2c063-firebase-adminsdk-*.json` (or equivalent), outside the workspace. | S |
| R0-3 | Remove key from `.env` | Delete `FIREBASE_ADMIN_PRIVATE_KEY` (and `FIREBASE_ADMIN_CLIENT_EMAIL`/`FIREBASE_ADMIN_PROJECT_ID` if hardcoded) from `.env`. | S |
| R0-4 | Point runtime to the key | Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json` locally; set `GOOGLE_APPLICATION_CREDENTIALS_JSON` or discrete `FIREBASE_ADMIN_*` vars in the hosting runtime (Netlify / App Hosting). | S |
| R0-5 | Verify git history stays clean | `git log --all -S 'BEGIN PRIVATE KEY' -- .env` must return nothing; `git check-ignore -v .env` must confirm `.env` is untracked. | S |

**Acceptance:** `.env` contains no private key; `sync-admin-claims.mjs` / Admin SDK still initializes via the new credential path; no secret ever committed.

**Why deferred:** you requested rotation be handled separately. Do not skip this before go-live — a live admin key in `.env` is a full platform compromise if the file leaks.

---

---

## R2 — Admin 2FA (TOTP) ⬜

| # | Step | Detail | Effort |
|---|------|--------|--------|
| R2-1 | Enable Identity Platform 2FA | Firebase Console → Authentication → Multi-factor authentication → enable second factor for admin accounts. | M |
| R2-2 | Update `sync-admin-claims.mjs` README | Document that admins enroll 2FA at first sign-in; claims still come from Firestore `role == 'admin'`. | S |
| R2-3 | Admin onboarding doc | Add step: admin signs in → enrolls second factor → middleware (`admin: true` claim) continues to gate `/admin/**`. | S |
| R2-4 | Verify no admin without 2FA | Audit Auth users: any user with `role == 'admin'` in Firestore must have 2FA enrolled in Auth. | S |

**Acceptance:** every admin account has a second factor; compromise of password alone does not grant `/admin/**` access.

---

## R3 — Dependency fixes ⬜

Fresh `npm audit --omit=dev --audit-level=high` (2026-10-29) found:

| Advisory | Package | Severity | Fix |
|----------|---------|----------|-----|
| GHSA-xjh9-v7x6-24jw | `@fastify/busboy` ≤3.2.1 | High — DoS via oversized multipart boundary | `npm audit fix` |
| GHSA-x8mw-p69m-v3mx | `@fastify/busboy` ≤3.2.1 | High — prototype-named multipart part header | `npm audit fix` |
| GHSA-gxm5-99cw-xjw9 | `@fastify/busboy` ≤3.2.1 | High — CRLF injection via multipart Content-Disposition | `npm audit fix` |
| GHSA-m9gg-hp2v-232j | `@grpc/grpc-js` | High — cert-auth bypass | Breaking Firebase upgrade (tracked) |
| GHSA-f596-whhp-79r4 | `@grpc/grpc-js` | High — handler errors leaked to client | Breaking Firebase upgrade (tracked) |

| # | Step | Detail | Effort |
|---|------|--------|--------|
| R3-1 | `npm audit fix` (root + functions) | ✅ Done 2026-10-29. `@fastify/busboy` → 3.2.4 (all 3 highs resolved). | S |
| R3-2 | **`next` 15.5.25 → 15.5.28 (CRITICAL fix)** | ✅ Done 2026-10-29. `next` was exact-pinned at 15.5.25 so `npm audit fix` could not touch it; manually bumped the patch version. Fixes GHSA-4jqv-mc3x-m676, GHSA-mcj8-r9mp-w47p, GHSA-2464-fhr4-w9xw (RCE in image optimization), GHSA-p3m5-59mp-jv5r + the postcss highs under the old next. Production build verified green. | S |
| R3-3 | Zod advisory | ✅ Resolved — GHSA-mrhx-c7xc-m3w5 no longer reported (patched within ^3 range); zod@4 migration **not** needed. | S |
| R3-4 | Track remaining advisories (accepted) | ⬜ Tracked: `@grpc/grpc-js` 2 highs (fix = firebase@9 *downgrade* — rejected; wait for a patched firebase@11.x/12 and upgrade forward), `postcss` 8.4.31 nested under next (build-time only, not runtime-exposed; fix = next@16 major — schedule deliberately), `uuid`/`teeny-request`/`gaxios` chain (moderate; fix = firebase-admin@14 major). Re-run `npm audit --omit=dev --audit-level=high` before each deploy. | S |
| R3-5 | Recurring cadence | Add `npm audit --omit=dev --audit-level=high` to pre-deploy checklist (no CI exists yet — see hygiene item). | S |

**Acceptance:** ✅ 0 critical, 0 fixable-by-non-breaking highs. Remaining 6 high are all inside major-version-upgrade chains (firebase@11, next@15→16, firebase-admin@13→14) — tracked deliberately, never use `npm audit fix --force` here (it would *downgrade* firebase to v9).

**⚠️ Windows note:** `npm run build` fails on Windows with `'NODE_ENV' is not recognized` (the build script uses Unix env syntax). Build with `$env:NODE_ENV='production'; npx next build` locally, or add `cross-env` to normalize.


---

## R5 — API key HTTP-referrer restriction ⬜

| # | Step | Detail | Effort |
|---|------|--------|--------|
| R5-1 | GCP Console restriction | APIs & Services → Credentials → the web API key (`AIzaSyAQTYUdReJQqB0YgC31EvJKNKpdsLPY48I`) → Application restrictions → HTTP referrers → add `https://learnkinetika.com/*`, `https://www.learnkinetika.com/*`, `http://localhost:9002/*` (dev), `http://localhost:3000/*` (dev). | S |
| R5-2 | Verify | Public site loads; a request from an unrelated domain with the key is rejected by Google. | S |

**Acceptance:** key unusable from unauthorized referrers.

---

## R6 — Firestore backups / PITR before go-live ⬜

`onCourseDelete` (`functions/src/index.ts:53`) irreversibly deletes a course's quizzes, content, resources, enrollments, progress, and Storage files on a single doc delete. One bad admin action = total data loss for that course with no rollback.

| # | Step | Detail | Effort |
|---|------|--------|--------|
| R6-1 | Enable PITR | Firebase Console → Firestore → Backups → enable Point-in-Time Recovery (7-day window). | S |
| R6-2 | Scheduled exports (optional) | Daily Firestore export to Cloud Storage for longer retention. | M |
| R6-3 | Restore drill | Document the restore procedure + test restoring a deleted course doc in a non-prod project. | M |

**Acceptance:** PITR enabled; restore drill documented and tested once.

---

## R7 — Repo hygiene ⬜

| # | Step | Detail | Effort |
|---|------|--------|--------|
| R7-1 | Stop tracking compiled functions output | `git rm -r --cached functions/lib` + add `functions/lib/` to `.gitignore` (predeploy rebuilds it anyway). | S |
| R7-2 | Remove junk tracked files | `git rm y .modified src/app/favicon.ico:Zone.Identifier`. | S |
| R7-3 | Rebrand `functions/.env.example` | Remove "DruptoLMS — Cloud Functions environment example" + Razorpay key placeholders (abandoned integration); rebrand to KINÉTIKA with only in-use vars. | S |
| R7-4 | Confirm `.env` stays untracked | `git check-ignore -v .env` returns `.gitignore:.env*`. | S |

**Acceptance:** `git status` clean of build artifacts/junk; no stale `lib/` can be deployed.

---

## R8 — Deploy sequence & verification ⬜

Run in order; each gate must pass before the next.

| # | Step | Command / action | Gate |
|---|------|------------------|------|
| R8-1 | Sync admin claims | `node scripts/sync-admin-claims.mjs` (with Admin credentials). Admins sign out/in so refreshed tokens embed `admin: true`. | Every admin can reach `/admin`; non-admins redirected. |
| R8-2 | Deploy infra | `firebase deploy --only firestore:rules,storage:rules,firestore:indexes,functions` | Deploy exits 0; functions build clean (Node 22). |
| R8-3 | 5-case enrollment rule test | Test against emulator or staging: (a) student creates pending enrollment, (b) admin approves, (c) student cannot set status=approved, (d) student cannot change another user's enrollment, (e) admin can read all. | All 5 pass (see `REMAINING_WORK.md` §9.5). |
| R8-4 | Smoke test | `/` 200, `/admin` without cookie → 307 → `/auth`, `/admin` with valid admin token → 200, quiz flow end-to-end (start → submit → review). | All green. |
| R8-5 | Admin claims re-sync reminder | Document: re-run R8-1 after every admin promotion. | — |

**Acceptance:** deploy + smoke test green; enrollment rules enforce the 5 cases; middleware fail-closed verified.

---

## Going-live readiness summary (at a glance)

| Item | Status | Blocker? |
|------|--------|----------|
| R0 key rotation | ⚠️ Deferred by owner | **Yes** — must complete before go-live |
| R1 server password policy | ⬜ | Yes |
| R2 admin 2FA | ⬜ | Yes |
| R3 dependency fixes | ⬜ Partial (✅ busboy + next 15.5.28 CRITICAL fixed 2026-10-29; grpc/postcss/uuid tracked as major-upgrade chains) | Partial (remaining need major upgrades — tracked) |
| R4 App Check | ⬜ | Yes (cost/abuse protection) |
| R5 API key restriction | ⬜ | Yes |
| R6 backups/PITR | ⬜ | Yes (irreversible delete risk) |
| R7 hygiene | ⬜ | No |
| R8 deploy sequence | ⬜ | No (runs after R0–R6) |

---

*This plan is a step-by-step implementation doc. Update status here when steps close; `REMAINING_WORK.md` keeps the index-level view. Re-run `npm audit` and re-verify rules after any change.*

---

## R4 — App Check (reCAPTCHA Enterprise) ⬜

Protects callable Functions (`startQuizAttempt`, `submitQuizAttempt`, `getQuizForStudent`), Firestore, and Storage from scripts/bots. Also closes the old H7 abuse surface as defense-in-depth.

| # | Step | Detail | Effort |
|---|------|--------|--------|
| R4-1 | Console setup | Firebase Console → Build → App Check → register app with reCAPTCHA Enterprise; note site key + secret. | S |
| R4-2 | Client wiring | Add `initializeAppCheck` in `src/lib/firebase.ts` (or `src/app/layout.tsx` client boundary) with the reCAPTCHA Enterprise site key; activate on page load. | S |
| R4-3 | Function enforcement | Firebase Console → App Check → enforce on Cloud Functions (the three quiz callables). Start in **monitor** mode, review logs, then switch to **enforce**. | S |
| R4-4 | Firestore + Storage enforcement | Enforce App Check on Firestore and Storage in console after Functions enforcement is stable. | S |
| R4-5 | Verify | A scripted call to a callable without an App Check token must be rejected; a normal browser flow must succeed. | S |

**Acceptance:** Functions reject unauthenticated-client calls; browser traffic unaffected; monitor→enforce rollout completed without breakage.


## R1 — Server-side password policy (Identity Platform) ⬜

Firebase Auth's default is 6 characters. The signup UI enforces 8+ char / upper / lower / digit in `src/app/auth/page.tsx:20`, but a tampered client can bypass it.

| # | Step | Detail | Effort |
|---|------|--------|--------|
| R1-1 | Enable password policy | Firebase Console → Authentication → Sign-in method → Password → Password policy → set minimum 8 chars, require uppercase, lowercase, number. (Requires Identity Platform upgrade if not already on it.) | S |
| R1-2 | Keep client validation | Retain the existing UI hint in `src/app/auth/page.tsx` as defense-in-depth (better UX errors). | — |
| R1-3 | Verify tampered-client rejection | Sign up with a 6-char password via a raw Firebase SDK call (browser console or script); expect `auth/weak-password` or equivalent and account must **not** be created. | S |

**Acceptance:** Firebase rejects any password below the server policy regardless of client.
