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
- [ ] Phase 4 — Institute panel `/institute` (tenant-scoped courses, students, sales, billing)
- [ ] Phase 5 — Student commerce (Buy → checkout → auto-enroll → learn gate)
- [ ] Phase 6 — Rebrand KINÉTIKA → DruptoLMS + README/.env/docs