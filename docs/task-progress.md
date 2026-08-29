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

### ✅ All items are complete. No outstanding features remain.

---

# DruptoLMS — Multi-Tenant SaaS Transition

> Plan: `docs/druptolms-transition-plan.md` · Gateway: Razorpay

- [x] **Phase 0 — Types & libs** (`types.ts`, `course.ts` role helpers, `institute.ts`, `orders.ts`, `razorpay.ts`, `currency.ts`, `utils.slugify`) — `npm run typecheck` ✅
- [x] **Phase 1 — Razorpay Cloud Functions** (`functions/src/payments.ts`): `createCheckout`, `handleRazorpayWebhook`, `verifyPayment`, `refundOrder`, `revokeEnrollment`, `syncUserClaims`, `reconcilePendingOrders`, `expireInstitutes`, `onInstituteDelete`; wired in `index.ts`; `.env.example` ×2; Firestore composite indexes; `razorpay@2.9.4` — functions build + root typecheck ✅
- [x] **Phase 2 — Security rules + session-cookie server guard**: `firestore.rules` (role helpers `isSuper`/`isInstitute`/`canManageCourse*`, tenant-scoped reads on orders/payouts/enrollments, function-only writes for ledger); `storage.rules` (super/institute course-manager writes); `/api/session` + `src/lib/session.ts` (HTTP-only session cookie, set on sign-in/out); `src/lib/auth-guard.ts` (`requireRole`/`sessionProfile` server-guard). Edge `middleware.ts` non-viable for firebase-admin in Next 15.5 `src/` layout → server enforcement via layout `requireRole()` (used in Phase 3/4). Root typecheck ✅ + production build ✅.
- [x] **Phase 3 — Super admin panel `/super`**: server-guarded layout (`requireRole('super')`); shell nav; dashboard (institutes/plans/orders/gross-revenue/commission stats + pending badge); Plans CRUD (name/price/period/commission/limits/published, edit + delete); Institutes list (status badge, activate/suspend via `setInstituteStatus`); Orders ledger (all orders, status badges, platform/inst share, refund via `httpsCallable('refundOrder')`); Payouts (pending→paid with bank ref). Admin lib `src/lib/admin.ts` (plan/institute/payout CRUD + refund callable; ledger writes stay server-side). Root typecheck ✅ + production build ✅ (26 routes incl. `/super`).
- [x] **Phase 4 — Institute panel `/institute`**: server-guarded layout (`requireRole('institute')` + `instituteId` from session claim, fetches institute server-side via `institute-server.ts`); shell (name, subscription status banner, nav); Dashboard (courses/students/paid-sales/net earnings); **Courses** (list, publish/unpublish, delete, create with `instituteId` injected, edit page with content sections — all tenant-scoped, ownership check on edit); **Students** (from denormalized `studentName`/`studentEmail` on enrollments); **Sales** (tenant orders + net/commission/refund split, buyer name/email); **Billing** (current plan, limits, renewal, available plans). Added `getCoursesForInstitute` + `createCourse` writes `instituteId`; `course-institute.ts` (tenant enrollments); `useInstitute` hook; denormalized buyer info on orders+enrollments from payments functions. Root typecheck ✅ + functions build ✅ + production build ✅ (32/32 pages, 41 routes incl. `/institute`). **Recheck fixes:** added missing composite indexes — `courses (instituteId, createdAt)` and `plans (published, priceInr)`, plus `EnrollmentStatus` `"revoked"`.
- [x] **Phase 5 — Student commerce (Buy → Razorpay → auto-enroll → learn gate)**: `src/lib/checkout.ts` (typed Razorpay checkout.js loader + `createCourseCheckout`/`verifyCheckoutPayment` callables + `openRazorpayCheckout` modal with prefill/theme/ondismiss); `course-detail.tsx` commerce flow — **Buy Now · ₹ / Enroll Free** via `createCheckout` (server-authoritative price, duplicate/in-flight guard), Razorpay modal → `verifyPayment` on success → auto-enrollment (`grantPaidOrder`) → redirect to learn; **Resume Payment** for pending orders (`getBlockingCourseOrder`); guest Buy → `/auth?redirect=` (safe internal redirect, honors `?redirect=` back to the course); free courses skip gateway and grant immediately; legacy manual request kept as secondary link; learn page gate shows distinct revoked/refund message; My Courses shows Revoked badge. Root typecheck ✅ + production build ✅. **Recheck fix:** `dashboard/available-courses` no longer bypasses commerce — legacy per-card `requestEnrollment` removed; non-enrolled courses now link to the course detail page (**View & Buy**) where the Razorpay flow lives (single commerce entry point; approved→Go to Course, pending→Pending Approval preserved; prices in ₹ via `formatINR`).
- [ ] Phase 6 — Rebrand KINÉTIKA → DruptoLMS + README/.env/docs