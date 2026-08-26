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
- [x] **Phase 2 — Security rules + session-cookie server guard**: `firestore.rules` (role helpers `isSuper`/`isInstitute`/`canManageCourse*`, tenant-scoped reads on orders/payouts/enrollments, function-only writes for ledger); `storage.rules` (super/institute course-manager writes); `/api/session` + `src/lib/session.ts` (HTTP-only session cookie, set on sign-in/out); `src/lib/auth-guard.ts` (`requireRole`/`sessionProfile` server-guard). NOTE: edge `middleware.ts` was found non-viable for bundling firebase-admin in Next 15.5 `src/` layout, so server-side enforcement is delivered via the layout-level `requireRole()` guard (used in Phase 3/4). Root typecheck ✅ + production build ✅ (21 pages, BUILD_EXIT:0)
- [ ] Phase 3 — Super admin panel `/super` (plans, institutes, orders, payouts)
- [ ] Phase 4 — Institute panel `/institute` (tenant-scoped courses, students, sales, billing)
- [ ] Phase 5 — Student commerce (Buy → checkout → auto-enroll → learn gate)
- [ ] Phase 6 — Rebrand KINÉTIKA → DruptoLMS + README/.env/docs