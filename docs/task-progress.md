# Implementation Task Progress

## 🔴 Bug Fixes & Code Cleanup
- [x] Fix `deleteCourseContentItem` — change `getDoc` to `deleteDoc`
- [x] Clean up `.env.local` — remove duplicate entries
- [x] Replace `window.location.href` with `router.push` in dashboard

## 🔴 Forgot Password Flow
- [x] Implement forgot password functionality on auth page

## 🟡 Admin Features
- [x] Add course deletion UI on admin courses page
- [x] Add content section reordering (move up/down buttons)
- [x] Admin dashboard analytics (total users, courses, enrollments)

## 🟡 User Features
- [x] Course search & filtering on `/courses` page
- [x] Profile settings page with editable name
- [x] Course progress tracking (Firestore collection + UI)
- [x] Learn page enhancements (prev/next navigation, completion marking)

## 🔵 Polish & Security
- [x] Navbar blur/scroll effect
- [x] Firebase Storage rules

---

## 🟠 Production Readiness (2026-08-31)

Feature work above is complete. Outstanding items are tracked in
[`docs/PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) and
[`SECURITY_AUDIT.md`](../SECURITY_AUDIT.md):

- [x] Production URL set to `https://learnkinetika.com` — `NEXT_PUBLIC_SITE_URL`, `seo.ts` fallback, `cors.json` (2026-08-31)
- [x] **H1** — `getYouTubeEmbedUrl` sanitized; render-time fallback added (2026-08-31)
- [x] **H7 (partial)** — input caps + injection delimiters applied; auth gate deferred to App Check (2026-08-31)
- [x] **M1** — credential patterns + `*:Zone.Identifier` in `.gitignore`; stray artifacts deleted (2026-08-31)
- [x] **M2** — `createUserProfile` role hardcoded to `student` (2026-08-31)
- [x] **M3** — enrollment `id` field validated against doc ID in rules (2026-08-31)
- [x] **M5** — `courses/` prefix check before storage deletes (2026-08-31)
- [x] **M6** — signup password policy (8+ chars, upper/lower/digit) + UI hint (2026-08-31)
- [x] `npm audit fix` — criticals eliminated; root prod advisories 89 → 62 (2026-08-31)
- [x] TS build gate re-enabled (`ignoreBuildErrors: false`); build re-verified green (2026-08-31)
- [x] **C3** — Edge middleware (`src/middleware.ts`) gates `/admin/**` server-side via `__session` ID token + `admin` custom claim; fail-closed (runtime-verified 2026-08-31). ⚠ Requires `node scripts/sync-admin-claims.mjs` before go-live
- [ ] **H3** — enrollment-scoped Storage reads: consciously deferred (documented in audit)
- [ ] Deploy updated `cors.json` (adds `https://learnkinetika.com` + `www`) via `gsutil cors set cors.json gs://cscs-prep-2c063.firebasestorage.app`
- [ ] Optional: CI pipeline + App Check

### ✅ All feature items are complete. Remaining work is production hardening — see the readiness report.
