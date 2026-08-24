# DruptoLMS — Multi-Tenant SaaS Transition Plan

> Status: **Approved** · Owner: Platform (super admin)
> Applies to: `/home/falcon1024/CPSSPlatform` (currently branded "KINÉTIKA")
> Gateway: **Razorpay** · Last updated: 2026-08-24

## 1. Overview & Goals

Turn the existing single-tenant LMS into **DruptoLMS**, a multi-tenant SaaS where:

1. **Coaching institutes** buy a monthly/annual **plan** and get their own LMS workspace to run courses.
2. **Students** browse a global marketplace, buy courses from any institute, and pay via **Razorpay**.
3. Every purchase (plan or course) is recorded in a **traceable ledger** (`orders` + `payouts`).
4. **Institute admins** see only their own courses/students/revenue.
5. A **super admin panel** gives the platform owner full control: institutes, plans, orders, refunds, payouts, global analytics.

## 2. Product Model

| Actor | Role | What they do |
|---|---|---|
| Platform owner | `super` | Manage plans, approve/suspend institutes, view all orders/revenue, refunds, payouts |
| Coaching institute | `institute` | Manage own courses/quizzes/resources, see own students & sales, manage subscription |
| Learner | `student` | Browse catalog, buy courses, learn, take quizzes, track progress |

**Funnel:** Signup (student) → Institute purchases plan → creates & publishes courses → Students buy courses (Razorpay) → enrollment auto-granted → learn/quiz/progress → Institute & super track revenue.

## 3. Current State (Baseline)

- Next.js 15 + React 19 + Tailwind; Firebase Auth/Firestore/Storage/Functions; Genkit AI.
- Roles: `student` | `admin` (global, single-tenant). Admin = manually set role.
- Collections: `users`, `courses`, `courses/{id}/content|quizzes|resources`, `progress`, `enrollments`, `quizAttempts`, `quizSessions`.
- Enrollments are manual request→approve. Courses have `price` but **no payment integration**. No `app/api/`, no middleware, no gateway.
- Cloud Functions: `onCourseDelete`, `startQuizAttempt`, `submitQuizAttempt`.
- Known gap (SECURITY_AUDIT): admin access is client-side checked only.

## 4. Target Architecture

### 4.1 Roles & Users

- `users/{uid}`: `role: 'super' | 'institute' | 'student'`, `instituteId?: string`, plus existing fields.
- Role changes only via server-side functions (never client writes).
- Custom claims + session cookie for middleware-based route guarding.

### 4.2 Firestore Data Model

| Collection | Key fields | Notes |
|---|---|---|
| `plans/{slug}` | name, priceInr, period, limits {maxCourses,maxStudents,storageGb,staffSeats}, commissionPct, published | Managed by super |
| `institutes/{id}` | slug, name, ownerUid, planId, subscriptionStatus (active/suspended/expired), limits, billing/payoutInfo, createdAt | Tenant root |
| `institutes/{id}/members/{uid}` | role (admin/staff), invitedBy, status | Seats from plan |
| `orders/{id}` | type (plan/course), buyerId, instituteId?, courseId?, amount, commissionPct (snapshot), status (pending/paid/failed/refunded), gatewayRef, refund {id,amount,at}, payments[] | **Ledger — function-write only** |
| `courses` | + `instituteId` (owner), keep `price`, `published` | Tenant-scoped |
| `enrollments/{userId_courseId}` | + `source` ('order'\|'manual'), `orderId?`, `paid`, `status` (pending/approved/revoked) | Deterministic ID = idempotent grants |
| `payouts/{id}` | instituteId, amount, periodStart/End, status (pending/paid/failed), orderIds[] | Super-initiated |
| `orders/rejectedEvents` | unmatched webhook payloads | Reconciliation bucket |

### 4.3 Payment Flow (Razorpay)

- **Create checkout** (onCall): server reads authoritative price from Firestore → block if institute inactive / course unpublished / duplicate active order → create Razorpay Order → write `orders/{id}` as `pending` → return order + key id.
- **Webhook** (HTTP v2): verify HMAC-SHA256 signature over **raw body** → load order → transaction with status guard (`pending→paid` only) → grant: course order → write enrollment `approved`; plan order → activate institute + upgrade role + claims → snapshot commission.
- **Client fallback** `verifyPayment` (onCall): verify `order_id+payment_id+signature` from checkout success redirect → idempotently do the same grant.
- **Free courses** (`price===0`): skip gateway, direct grant.
- **Refunds** (onCall): Razorpay `payments.refund` + `refundId/refundedAt/refundedAmount`; full refund revokes access.
- **Scheduled**: `reconcilePendingOrders` (daily), `expireInstitutes` (daily, grace period).

### 4.4 Route Map

- `/` marketing (rebranded DruptoLMS)
- `/super` — dashboard, institutes (approve/suspend), plans CRUD, orders, refunds, payouts, global analytics
- `/institute` — dashboard, own courses/quizzes (reuse existing UI, scoped by `instituteId`), own students, own orders/sales, subscription/billing
- `/admin` → migrated to super-only
- `/courses/[slug]` — public detail + Buy (Razorpay checkout)
- `/dashboard` — My Courses (from paid enrollments), Available Courses, Progress, Profile (student, unchanged mechanics)

## 5. Cloud Functions (additions)

| Function | Trigger | Purpose |
|---|---|---|
| `createCheckout` | onCall | Validates + creates Razorpay order + pending `orders` doc |
| `handleRazorpayWebhook` | HTTP v2 | Signature verify → idempotent grant/activation |
| `verifyPayment` | onCall | Client fallback for success redirect |
| `refundOrder` | onCall | Refund + revoke access (super/institute) |
| `revokeEnrollment` | onCall | Manual access revocation |
| `reconcilePendingOrders` | scheduled (daily) | Close abandoned pending orders; retry paid-without-grant |
| `expireInstitutes` | scheduled (daily) | Enforce subscription lifecycle + grace period |
| `onInstituteDelete` | Firestore | Cascade cleanup (archive courses, keep ledger) |
| `setClaims` | onCall | Role → custom claims sync after purchase |
| `onCourseDelete` (existing) | Firestore | Keep, extend for archived-courses policy |

## 6. Security Rules & Middleware

- `firestore.rules`: replace `isAdmin()` with `isSuper()`, `isInstitute()`, `canManageCourse()` (owner/tenant), staff via `institutes/{id}/members`.
- `orders`: `allow create/update/delete: if false` (function-write only, mirrors `quizAttempts`).
- `enrollments`: create stays `pending`-only; `approved`/`revoked` only via functions.
- `users`: role/`instituteId` changes blocked client-side.
- `middleware.ts` + session cookies: server-side guard for `/super`, `/institute`, `/admin`, `/dashboard` (closes SECURITY_AUDIT gap).
- Re-verify institute status + enrollment on **every** protected read (learn/quiz rules).

## 7. Edge Cases & Mitigations

### A. Payments (Razorpay)
1. Abandoned checkout / stuck `pending` → resume button + `reconcilePendingOrders`.
2. Lost webhook → `verifyPayment` fallback + manual "Sync order" in super panel.
3. Duplicate webhook → transaction status guard + deterministic enrollment ID.
4. Out-of-order events → only `pending→paid`; stale `failed` ignored.
5. Signature must verify against raw body → constant-time compare before any read/write.
6. Amount tampering → authoritative server-side price; webhook compares captured amount → mismatch = flag + refund.
7. Event for unknown order → `orders/rejectedEvents` + super alert.
8. Test/live key mixing → env mode guard.
9. Free course → direct grant, no gateway.
10. Buying from suspended/unpublished institute → blocked at checkout AND re-checked at webhook → refund+flag if race.
11. Duplicate purchase → one active order per (buyer, course); already-paid → "Already enrolled".
12. Institute staff buying own course → blocked server-side.
13. Price changed after render → always server read + snapshot on order.

### B. Subscription lifecycle
14. Plan expiry with enrolled students → grandfather access; institute read-only until renewal.
15. Renewal failure → grace period (configurable) → suspend + notify.
16. Upgrade mid-cycle → apply immediately (proration documented as future).
17. Downgrade below usage → block new writes over limit; never delete data.
18. Institute deleted → cascade archive; ledger preserved; students keep access to purchased courses.
19. Commission changed later → snapshot per order; never retroactive.
20. Staff seats exceeded → enforced in rules + function.
21. Plan deactivated by super → no new purchases; active subs honored.

### C. Multi-tenancy
22. Cross-tenant read → every doc gated by `instituteId` + role.
23. Slug collision across tenants → uniqueness enforced at create.
24. Legacy `role:'admin'` → migrate to `super`; role self-assignment forbidden.
25. `/admin` vs `/institute` split → middleware guards.
26. Marketplace students (`instituteId: null`) → all dashboard code tolerant of null.
27. Analytics leakage → all course-analytics queries gated by `canManageCourse()`.

### D. Enrollment / access
28. Manual vs paid enrollment → same gate doc; manual approve stays as "grant access" tool.
29. Refund → revoke → learn/quiz rules require `status=='approved'`.
30. Course deleted after purchase → archive + ledger retained + refund policy surfaced.
31. Quiz attempt on revoked course → rule checks live enrollment, not just auth.

### E. Refunds & payouts
32. Double-refund → idempotent (`refundId` stored).
33. Partial refunds → keep access, track `refundedAmount`.
34. Refund after payout → Razorpay transfer reversal + adjusted ledger.
35. Payout failure → status machine + super retry UI.
36. Dashboard money display → gross − commission(snapshot) − refunds; labeled estimated vs settled.
37. GST/TDS → tax fields stored on order; payout tax documented as future.

### F. Security
38. Forged `order.status=paid` → rules deny all client writes on `orders`.
39. Forged enrollment approval → create rule forces `pending`; only functions write `approved`.
40. Stale claims post-purchase → force `getIdToken(true)` + cookie refresh.
41. Self-promotion to super → role changes server-side only.
42. Revoked user with cookie → middleware re-checks status each request.
43. Webhook abuse → signature is the only auth; payload-size cap + rate limit.
44. Secret leakage → keys only in function env config; `.env.example` never real values.

### G. Concurrency
45. Webhook vs verifyPayment race → single transaction status guard → exactly-once.
46. Webhook before order doc → order written before checkout returns; missing → reject + alert.
47. Multi-step grant partial failure → transaction bundles order+grant; reconcile job retries.

### H. Migration & legacy
48. Existing courses unowned → migration assigns platform tenant / provided mapping.
49. Existing pending enrollments → keep working; approvable by super/institute.
50. Rule deployment ordering → deploy rules with code; functions use Admin SDK.
51. Dashboard counts → use Firestore `count()` aggregate (fixes rules-blocked `getDocs`).

### I. Scale / performance
52. Composite-index explosion → equality filters only; add indexes deliberately to `firestore.indexes.json`.
53. Large lists → cursor pagination on super/institute panels.
54. Storage quotas → track per institute; block over-quota uploads.

### J. UX
55. Guest Buy → `/auth?redirect=` back to course.
56. Incomplete profile → complete profile gate before checkout.
57. Delayed webhook → success page runs `verifyPayment` + "no access yet? refresh" state.
58. Unauthorized `/learn` → redirect to detail with CTA.
59. INR formatting, empty states, suspension banner → shared UI helpers.

## 8. Migration Plan

1. Snapshot Firestore (`gcloud firestore export`).
2. Migrate roles: `role=='admin'` → `role=='super'`; create platform tenant.
3. Assign `instituteId` on all existing courses (platform tenant by default).
4. Deploy rules BEFORE enabling new features; deploy functions; then client code.
5. Keep manual enrollment approve/revoke for legacy pending requests.

## 9. Implementation Phases (each ends with a validation gate)

| Phase | Scope | Gate |
|---|---|---|
| 0 | Types + `institute.ts` + `orders.ts` + `razorpay.ts` (server lib) | `npm run typecheck` |
| 1 | `payments.ts` functions: `createCheckout`, webhook, `verifyPayment`, refunds; wire `index.ts`; `.env.example` | Local emulator e2e (test/live keys) |
| 2 | `firestore.rules` rewrite + `middleware.ts` + claims | Rules test + guarded routes |
| 3 | Super admin `/super` (dashboard, institutes, plans, orders, payouts) | Manual + lint/build |
| 4 | Institute panel `/institute` (scoped course/quiz UI reuse, students, sales, billing) | Manual tenant isolation test |
| 5 | Student commerce (Buy button, checkout, post-payment learn gate) | Full purchase e2e + webhook idempotency test |
| 6 | Rebrand KINÉTIKA → DruptoLMS (seo.ts, layouts, navbar/footer/auth), README, docs, index updates | `npm run build` clean |

## 10. Testing & Validation

- `npm run typecheck` + `npm run build` after every phase.
- Functions emulator: checkout → webhook (simulated + real Razorpay test mode) → grant.
- Idempotency tests: duplicate webhook, double verifyPayment, stale events.
- Tenant isolation tests: institute A user cannot read institute B orders/students/courses.
- Security rules test suite (rules-unit-tests) for the new role helpers.
- Manual QA checklist per role (super / institute / student).

## 11. Decisions Record

| Decision | Choice | Rationale |
|---|---|---|
| Gateway | Razorpay | INR pricing, Orders API + webhooks |
| Marketplace model | Global catalog | Students can buy from any institute |
| Signup | Student-first | Institute only after plan purchase |
| Commission | Snapshotted per order | Never retroactive |
| Enrollment | Auto via paid order | Deterministic doc ID = idempotent |
| Plan expiry | Grandfather students; institute read-only | Fair to students |

## 12. Out of Scope (documented future)

- Subscription proration, recurring billing automation (Razorpay subscriptions v2)
- GST/TDS invoice automation
- Certificate generation, LMS features (discussions, assignments, live classes)
- Native mobile apps

## 13. Risks

- Razorpay webhook delivery latency → mitigated by `verifyPayment` fallback + reconcile job.
- Rules complexity → keep helpers small, test with rules unit tests.
- Rebrand scope → single `siteConfig` source of truth; grep sweep listed in Phase 6.
- Data migration → snapshot + incremental rollout, super panel used for validation.