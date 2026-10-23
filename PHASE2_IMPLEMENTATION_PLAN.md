# KINÉTIKA — Phase 2 Implementation Plan

> **Purpose:** single source of truth to resume Phase 2 work in a later session without re-discovery.
> **Created:** 2026-10-23 · **Status:** awaiting client decisions (§3) · **Owner:** dev
> **How to resume:** read §2 (state) → §3 (blockers) → §5 (repo constraints) → §14 (execution checklist) → start at the first unchecked item.
> **Repo-wide open items** (launch blockers, security, SEO, DPDP): see [`REMAINING_WORK.md`](./REMAINING_WORK.md).

**Contents:** [1 Scope](#1-scope-at-a-glance) · [2 Current state](#2-current-state-phase-1--already-built--delivered) · [3 Blocking decisions](#3-blocking-decisions-need-client-answers-before-f1-coding) · [4 Commercials](#4-commercials-internal--do-not-share-this-section) · [5 Repo constraints](#5-repo-constraints--must-follow-violating-these-breaks-production) · [6 Architecture](#6-target-architecture--file-map) · [7 F0 Brevo](#7-f0--brevo-email-foundation) · [8 F5 Notifications](#8-f5--payment--approval-notifications) · [9 F1 Referrals](#9-f1--referral-system) · [10 F2 CRM](#10-f2--crm-in-the-admin-panel) · [11 F3 Certificates](#11-f3--completion-certificates) · [12 F4 Billing](#12-f4--receipts--gst-invoices--refunds) · [13 Rules](#13-firestore-rules--required-changes) · [14 Checklist](#14-execution-checklist-work-top-to-bottom) · [15 QA](#15-qa-matrix-emulator-first-then-staging) · [16 Deploy](#16-deployment--operations) · [17 Risks](#17-risks--gotchas-read-before-acting) · [18 Out of scope](#18-explicitly-out-of-scope-phase-2) · [19 Log](#19-session-log)

---

## 1. Scope at a glance

Six features sold as one Phase 2 engagement:

| ID | Feature | Effort | Priority |
|----|---------|--------|----------|
| F0 | Brevo email foundation (shared module, templates, webhook, suppressions) | 2–3 d | **P0 — build first** |
| F1 | Referral system (gym owners + individuals, coupon codes, earnings, payouts) | 4–5 d | P0 |
| F2 | CRM in admin panel (contacts, pipeline, tasks, notes, reports) | 5–6 d | P1 |
| F3 | Completion certificates + public QR verification | 2–3 d | P1 |
| F4 | Payment receipts / GST invoices + refund workflow | 3–4 d | P1 |
| F5 | Payment & approval notification emails | 0.5–1 d | P0 (part of F0) |
| | **Total** | **17–21 working days** | |

Order matters: **F0 → F1 → F5 → F2 → F4 → F3**. F0 unblocks every other feature's notifications; F1 and F4 share the enrollment-approval trigger.

---

## 2. Current state (Phase 1 — already built & delivered)

### What exists
- **Next.js 15.5.25 App Router** + React 19 + TypeScript 5 + Tailwind 3 + shadcn/ui (Radix) + lucide-react + recharts + date-fns + zod + react-hook-form.
- **Firebase**: Auth (email/password + verification), Firestore, Storage, Cloud Functions v2 (Node 22).
- **Public site**: home, courses catalog, course detail, checklist lead magnet (`checklistEnquiries`), FAQ, terms, privacy.
- **Student area**: `/dashboard` (courses, available courses, progress, resources, profile), `/courses/[slug]/learn` (content stream, video, PDFs, flashcards, inline quizzes), `/courses/[slug]/pay`.
- **Admin area**: `/admin` (cards), `/admin/courses` (+ new, edit, quizzes, per-course analytics), `/admin/enrollments` (manual approve/reject/revoke), `/admin/resources`.
- **Payments**: manual UPI only. Student submits a pending enrollment with a UTR via `submitPaymentRequest()`; admin matches the reference and approves. PayPal is disabled (`PAYPAL_ENABLED` in `src/lib/payments.ts`).
- **Cloud Functions today**: `onCourseDelete` (asia-south2, cascade cleanup), `startQuizAttempt`, `submitQuizAttempt`, `getQuizForStudent` (us-central1 callables).

### Firestore collections in use
`users`, `courses` (+ subcollections `content`, `quizzes`, `resources`), `enrollments`, `progress`, `quizAttempts`, `quizSessions`, `checklistEnquiries`.

### What does **not** exist yet
Email/SMS/WhatsApp of any kind · referral/coupon logic · CRM · certificates · invoices/receipts · refunds · notifications · admin audit log · granular roles · analytics beyond per-course quiz stats.

### Phase 1 commercial
₹10,000 charged for the platform above (fixed). Phase 2 is quoted separately — do **not** let ₹10,000 anchor the Phase 2 rate. See §4.

---

## 3. Blocking decisions (need client answers before F1 coding)

| # | Question | Default if client is silent | Impact |
|---|----------|------------------------------|--------|
| D1 | Does the coupon give the **lead a discount**, the **referrer a commission**, or both? | **Both**: lead gets `leadDiscountPct` off, referrer gets `commissionPct` of net amount | Data model + pay page UI + invoice math |
| D2 | Discount % for the lead | **10%** | `appSettings/commissions.leadDiscountPct` |
| D3 | Commission % for the referrer | **10% gyms / 5% individuals** | `appSettings/commissions.commissionPctGym` / `commissionPctIndividual` |
| D4 | Auto-approve referrers or admin review first? | **Admin review** (status starts `pending`) | Prevents fake gym signups + fraud |
| D5 | Minimum payout + cadence | **₹500, paid on the 1st & 15th** | `payouts` flow |
| D6 | Commission on every purchase by the same lead, or first purchase only? | **First purchase per lead per course** | Dedupe key |
| D7 | Kanban drag-and-drop dependency? | **Native HTML5 drag + stage dropdown fallback** (no new deps); upgrade to `@dnd-kit` only if requested | F2 build |
| D8 | Is the business **GST-registered**? | **No → issue "Payment Receipt"**, not "Tax Invoice"; `gstEnabled=false` until GSTIN provided | F4 legal correctness |
| D9 | Are referrer payouts commission-only, or also a reseller margin? | **Commission-only** in Phase 2 | Scope |

All of these live in `appSettings/commissions` so they are changeable without a deploy.

---

## 4. Commercials (internal — do not share this section)

### Recommended quote
| Package | Includes | Price |
|---|---|---|
| Starter | F0 + F5 + F1 | ₹38,000 |
| Growth ⭐ | Starter + F2 | ₹68,000 |
| Complete | Growth + F3 + F4 | ₹85,000 |

- **Floor:** ₹60,000 for the full set. If the client pushes back, cut scope (move CRM reports or the referrer dashboard to Phase 3) — do not cut price.
- **Terms:** 40% advance · 30% at CRM demo · 30% on launch.
- **Timeline:** 4–5 weeks from advance + credentials + content.
- **Warranty:** 30 days free bug fixes post-launch (new features excluded).
- **AMC:** ₹8,000/month or 18%/year — monitoring, template edits, small fixes.
- **Change requests:** ₹2,000/hour.
- **Pass-through (client pays directly):** Brevo plan, Firebase usage, domain. Never absorb these.
- **GST:** +18% if registered; state inclusive/exclusive explicitly.

### Client-facing quote text
```
Hi! Here's the Phase 2 scope and pricing 👇

Phase 2 features:
• Referral system with coupon codes + referrer dashboard + admin panel
• CRM in admin panel — leads, pipeline, tasks, notes, filters, reports
• Brevo email integration — all auto emails + admin campaigns
• Completion certificates with QR verification
• Payment receipts / GST invoices + refund workflow
• Payment & approval email notifications

Options:
• Starter (email + referral): ₹38,000
• Growth (Starter + CRM): ₹68,000 ⭐
• Complete (everything above): ₹85,000

Timeline: 4–5 weeks from advance
Payment: 40% advance · 30% at CRM demo · 30% on launch
Includes: 30 days free bug support after launch
Separate: Brevo subscription, Firebase usage, AMC ₹8,000/month

Reply with which option you'd like and I'll share the scope document and start date.
```

---

## 5. Repo constraints — MUST follow (violating these breaks production)

1. **No `src/app/api/**` routes.** All server logic lives in `functions/`. The Next.js app is a client SPA over Firebase.
2. **Callables run in `us-central1`.** `src/lib/firebase.ts:60` does `getFunctions(app, "us-central1")`. New `onCall` functions must declare `region: "us-central1"` or the client 404s.
3. **Firestore triggers run in `asia-south2`.** See `functions/src/index.ts:57-60`. New document triggers must declare `region: "asia-south2"`.
4. **Firebase is initialized only in the browser** (`src/lib/firebase.ts:47`, guarded by `typeof window !== "undefined"`). New Firebase-touching modules must be imported from `"use client"` components only.
5. **Admin gating is two-layer:** `src/middleware.ts` verifies the ID token + `admin` custom claim for `/admin/**`, and every page additionally calls `isAdminProfile(profile)`. New admin pages follow both.
6. **Payments are manual UPI.** Enrollment doc = `enrollments/{uid}_{courseId}` written by `submitPaymentRequest()` (`src/lib/course.ts:227`) with a **hard 8-field whitelist** at `firestore.rules:219`. Adding referral fields requires editing **both** the `create` rule and the student `update` branch (`firestore.rules:258`), plus the client writer.
7. **Deterministic doc IDs** are the house pattern for dedupe/retry safety (`{uid}_{courseId}`). Use them for referrals, certificates and CRM contacts (hashed email).
8. **Never make coupon docs client-readable** — codes get scraped if listed. Validate through a callable (Admin SDK bypasses rules).
9. **Idempotency everywhere:** Firestore triggers retry on failure. Every trigger handler must be safe to run twice (transaction + existence check, `IdempotencyKey` header for Brevo).
10. **Existing UI conventions:** `max-w-6xl` page shells, `bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-white/10`, lucide icons, `Button`/`Card`/`Dialog`/`Table` from `src/components/ui/*`, dark-mode variants on every color.
11. **No new dependency without a reason.** Installed: `recharts`, `date-fns`, `zod`, `firebase` (includes `messaging`). Cloud Functions will need `pdf-lib` and `qrcode` (F3/F4 only).

---

## 6. Target architecture & file map

### New Firestore collections
| Collection | Doc ID | Purpose |
|---|---|---|
| `referrers` | `{uid}` | Referrer profile: code, type, status, rates, payout details, totals |
| `referralCodes` | `{CODE}` (uppercase) | Code → referrer lookup. **Deny all client reads** |
| `referrals` | `{referrerId}_{leadUid}_{courseId}` | One attribution per lead+course; amount, commission, status |
| `payouts` | auto | Referrer payout requests + admin settlement (UTR) |
| `crmContacts` | `sha256(lowercased email)` | CRM contact record (leads, students, referrers) |
| `crmActivities` | auto | Timeline: note, call, email, whatsapp, stage change, task, payment |
| `crmTasks` | auto | Follow-up tasks with `dueAt`, status, assignee |
| `certificates` | `{uid}_{courseId}` | Issued certificate metadata + verification ID |
| `invoices` | auto | Receipt / GST invoice, sequential number, PDF path |
| `refunds` | auto | Refund request, approval, UTR, access revocation |
| `counters` | `invoices`, `invoices-{FY}` | Sequential invoice numbering (transaction) |
| `emailLog` | auto | Every Brevo send: template, messageId, status, error |
| `suppressions` | `sha256(email)` | Unsubscribes, hard bounces, complaints |
| `emailCampaigns` | auto | Admin bulk campaigns + stats |
| `appSettings` | `commissions`, `billing`, `branding` | Rates, GST, invoice prefix, sender identity |
| `adminAuditLog` | auto | Actor, action, target, before/after (approvals, refunds, code edits) |

### New Cloud Functions (`functions/src/`)
| File | Exports | Trigger/region |
|---|---|---|
| `email/brevo.ts` | `sendEmail`, `upsertBrevoContact`, `sendCampaign` (internal) | — |
| `email/templates.ts` | Template renderers (HTML strings, no dep) | — |
| `email/index.ts` | `sendTestEmail`, `sendCampaign`, `brevoWebhook`, `unsubscribe` | callables us-central1; HTTP onRequest us-central1 |
| `referrals.ts` | `applyAsReferrer`, `validateReferralCode`, `requestPayout` | onCall us-central1 |
| `referrals-triggers.ts` | `onEnrollmentApprovedReferral`, `onEnrollmentReversedReferral` | onDocumentUpdated enrollments, asia-south2 |
| `crm.ts` | `upsertCrmContact`, `logCrmActivity`, `createCrmTask`, `completeCrmTask`, `convertContactToStudent` | onCall us-central1 |
| `crm-triggers.ts` | `onChecklistEnquiryCreated`, `onUserProfileCreated`, `onEnrollmentWritten`, `crmTaskReminders` (scheduled) | asia-south2 / scheduled |
| `certificates.ts` | `issueCertificate`, `verifyCertificate`, `getCertificateDownloadUrl` | callable (verify = public) |
| `billing.ts` | `issueInvoiceForEnrollment`, `requestRefund`, `processRefund`, `cancelInvoice` | triggers asia-south2 / callables |
| `notifications.ts` | `notifyEnrollmentSubmitted/Approved/Rejected`, `notifyReferralJoined`, `notifyPayoutPaid` | trigger helpers, wired from the enrollment triggers |
| `audit.ts` | `writeAuditLog` helper + `onEnrollmentUpdatedAudit` | asia-south2 |

Register every export in `functions/src/index.ts` (see existing pattern at lines 135–138).

### New client modules (`src/lib/`)
| File | Contents |
|---|---|
| `src/lib/referrals.ts` | `applyAsReferrer`, `getMyReferrerProfile`, `validateReferralCode`, `getMyReferrals`, `requestPayout`, admin list/approve helpers |
| `src/lib/crm.ts` | Contact CRUD, stage moves, activity log, tasks, segments, report queries |
| `src/lib/email-admin.ts` | Campaign compose/send, template list, email log query, suppression list |
| `src/lib/billing.ts` | Invoice download, refund request/process, receipt list |
| `src/lib/certificates.ts` | Issue + fetch + verify + download |
| `src/lib/types/*.ts` | Types per domain, mirroring `src/lib/types/quiz-functions.ts` style |

### New pages
| Route | Access | Purpose |
|---|---|---|
| `/partners` | public | Referral program landing + "Join as gym / individual" |
| `/partners/apply` | public | Application form (creates `pending` referrer) |
| `/partners/dashboard` | referrer | Code, share link, leads, earnings, payouts, marketing kit |
| `/verify/[id]` | public | Certificate verification (QR target) |
| `/admin/crm` | admin | Contact list + filters + saved segments |
| `/admin/crm/[contactId]` | admin | Contact detail: timeline, tasks, notes, emails, enrollments |
| `/admin/crm/pipeline` | admin | Kanban by stage (native DnD + dropdown fallback) |
| `/admin/referrals` | admin | Applications, codes, referrals, commission ledger, payouts |
| `/admin/payments` | admin | Invoices, refunds, revenue summary (or extend `/admin/enrollments`) |
| `/admin/campaigns` | admin | Compose/send Brevo campaigns, view stats + email log |

Nav: add cards to `src/app/admin/page.tsx` (existing `<Link>` grid) and a "Partners" item to `src/components/navbar.tsx` + `src/app/sitemap.ts`.

---

## 7. F0 — Brevo email foundation

**Goal:** one shared, idempotent, suppression-aware email module every other feature calls.

### Brevo API facts (verified)
- Send: `POST https://api.brevo.com/v3/smtp/email`, header `api-key: <BREVO_API_KEY>`, JSON `{ sender: {name,email}, to: [{email,name}], subject, htmlContent, textContent, replyTo, tags, attachment }` → returns `{ messageId }`.
- Idempotency: send header `IdempotencyKey: <stable-hash>` so retries don't duplicate.
- Contacts: `POST https://api.brevo.com/v3/contacts` with `{ email, attributes, listIds, updateEnabled: true }` (409 = already exists).
- Webhook events: `delivered`, `opened`, `clicked`, `hard_bounce`, `soft_bounce`, `spam`, `unsubscribed`.
- Free tier ≈ 300 emails/day — chunk campaigns and handle 429 with exponential backoff.
- Deliverability needs **SPF, DKIM, DMARC** on `learnkinetika.com` (client-side DNS task; flag as a dependency, not code).

### Implementation
```
functions/src/email/brevo.ts
  sendEmail({ to, toName, subject, html, text?, template, tags?, relatedId?, idempotencyKey? })
    1. normalize + lower-case email
    2. if suppressions/{sha256(email)} exists → log "suppressed", return
    3. POST to Brevo with AbortController timeout (10s)
    4. write emailLog/{auto}: to, template, subject, messageId, status, error, relatedId, createdAt
    5. 429/5xx → retry ≤3 with backoff; 4xx → log failure and throw
  upsertBrevoContact({ email, attributes, listIds })
  renderTemplate(name, vars) → delegates to templates.ts
```
```
functions/src/email/templates.ts
  Branded shell: table-based, inline CSS (email clients drop <style>), 600px wide,
  brand colors matching the site, dark-safe, preheader text.
  Templates (name → subject):
    welcome                → "Welcome to KINÉTIKA"
    checklist-delivery     → "Your CSCS Study Checklist"
    enrollment-submitted   → "We've received your payment details"
    enrollment-approved    → "You're in — course access is live"
    enrollment-rejected    → "Action needed on your enrollment"
    payment-reminder-24h   → "Still pending: your enrollment verification"
    payment-reminder-72h   → "Your seat is still on hold"
    referral-joined        → "Your referral code is live"
    referral-converted     → "You earned ₹{{commission}} — {{leadName}} enrolled"
    payout-paid            → "Payout of ₹{{amount}} sent"
    certificate-issued     → "Your certificate is ready"
    invoice-issued         → "Receipt for your KINÉTIKA enrollment"
    refund-processed       → "Your refund has been processed"
  Every marketing template carries {{unsubscribeUrl}}; transactional ones
  (approval, receipt, certificate) omit it but still honor bounce suppressions.
```
```
functions/src/email/index.ts
  sendTestEmail    (onCall, admin) → sends to the caller's own address
  sendCampaign     (onCall, admin) → { name, subject, html, filter }
      resolves segment from crmContacts, chunks of 50, skips suppressions,
      writes emailCampaigns/{id} + stats, returns queued count
  brevoWebhook     (onRequest) → shared-token check; updates emailLog status and
      emailCampaigns stats; writes suppressions on hard_bounce/spam/unsubscribed
  unsubscribe      (onRequest) → verifies HMAC token (UNSUBSCRIBE_SECRET), writes
      suppressions, returns a plain confirmation page
```

### Env (`functions/.env`, never commit real values; mirror in `.env.example`)
```
BREVO_API_KEY=
BREVO_SENDER_EMAIL=hello@learnkinetika.com
BREVO_SENDER_NAME=KINÉTIKA
BREVO_REPLY_TO=hello@learnkinetika.com
BREVO_LIST_ID=
BREVO_WEBHOOK_TOKEN=
UNSUBSCRIBE_SECRET=
SITE_URL=https://learnkinetika.com
ADMIN_EMAIL=
```

### Acceptance criteria
- [ ] Test email arrives from `learnkinetika.com` with valid SPF/DKIM (inspect headers).
- [ ] Duplicate trigger invocation → exactly one `emailLog` doc and one delivery.
- [ ] Hard-bounce webhook adds `suppressions` and blocks the next send.
- [ ] Unsubscribe link → suppressions row → marketing skipped, transactional still allowed.
- [ ] Every failure visible in `emailLog` (no silent `catch {}`).

---

## 8. F5 — Payment & approval notifications

| Event | Source | Recipient | Template |
|---|---|---|---|
| Enrollment submitted | `onDocumentCreated enrollments` | Student | `enrollment-submitted` |
| Enrollment submitted | same | Admin (`ADMIN_EMAIL`) | `enrollment-submitted` (admin variant with UTR + link) |
| 24 h still pending | daily scheduled job | Student + admin | `payment-reminder-24h` |
| 72 h still pending | daily scheduled job | Student | `payment-reminder-72h` |
| Approved | `onDocumentUpdated enrollments` | Student | `enrollment-approved` |
| Rejected | `onDocumentUpdated enrollments` | Student | `enrollment-rejected` |
| Referrer approved | admin action | Referrer | `referral-joined` |
| Referral converted | enrollment approved | Referrer + admin | `referral-converted` |
| Payout paid | admin marks paid | Referrer | `payout-paid` |
| Certificate issued | `issueCertificate` | Student | `certificate-issued` |
| Invoice issued | enrollment approved | Student | `invoice-issued` |
| Refund processed | `processRefund` | Student | `refund-processed` |

**Notes**
- Keep one `onEnrollmentWritten` handler that fans out to all enrollment templates — do not add a trigger per template.
- Dedupe with a deterministic `emailLog/{sha256(email + template + relatedId)}` doc ID; retries become no-ops.
- Reminders: `onSchedule("0 10 * * *", { timeZone: "Asia/Kolkata", region: "asia-south2" })`; query pending enrollments older than 24 h/72 h and skip if already logged.
- Never put a student's full UTR in an email subject.

---

## 9. F1 — Referral system

### 9.1 User flow
```
Gym owner / individual
  → /partners/apply  (business name, type: gym|individual, city, phone, email,
                      UPI ID for payouts, expected audience)
  → referrers/{uid} = { status: "pending" }
  → Admin approves in /admin/referrals
      → generates unique code (e.g. GYM-4F7K2) + referralCodes/{CODE}
      → status "active", rates snapshotted from appSettings
      → email "referral-joined"
  → /partners/dashboard: code, link https://learnkinetika.com/courses?ref=CODE,
      QR poster, WhatsApp share text, lead list, earnings, payout requests

Lead
  → lands on /courses/[slug]/pay?ref=CODE (or types the code in the pay form)
  → validateReferralCode() callable → { valid, discountPct, finalAmount, referrerName }
  → pays the discounted amount via UPI
  → submitPaymentRequest() stores enrollment + referral fields (still "pending")
  → admin verifies UTR, approves
  → trigger onEnrollmentApprovedReferral:
      creates referrals/{referrerId}_{leadUid}_{courseId}
      increments referrer totals, tags CRM contact, emails referrer + admin
  → referrer requests payout once pending ≥ minPayout
  → admin pays via UPI, records UTR → status paid, email "payout-paid"
```

### 9.2 Data model
```ts
// referrers/{uid}
{
  userId, code, type: "gym" | "individual",
  businessName, contactName, email, phone, city,
  status: "pending" | "active" | "suspended",
  discountPct, commissionPct,            // snapshot at approval
  payout: { upiId, accountName },
  totals: { leads, paidLeads, grossRevenue, commissionEarned,
            commissionPaid, commissionPending },
  createdAt, approvedAt, approvedBy, notes
}

// referralCodes/{CODE}   — admin-only reads, writes via callable
{ code, referrerId, active, discountPct, commissionPct, createdAt }

// referrals/{referrerId}_{leadUid}_{courseId}
{
  referrerId, referrerCode, leadUid, leadEmail, leadName, leadPhone,
  courseId, courseTitle,
  grossAmount, discountAmount, amountPaid,
  commissionPct, commissionAmount,
  status: "pending" | "qualified" | "paid" | "reversed",
  enrollmentId, payoutId?, createdAt, qualifiedAt, paidAt, reversedAt, reversalReason
}

// payouts/{auto}
{ referrerId, referralIds[], amount, status: "requested" | "processing" |
  "paid" | "rejected", method: "upi", utr?, requestedAt, processedAt,
  processedBy, note }

// appSettings/commissions
{ leadDiscountPct, commissionPctGym, commissionPctIndividual,
  minPayout, payoutDays: [1, 15], autoApproveReferrers,
  allowSelfReferral: false, stackableWithCoupons: false,
  commissionOnFirstPurchaseOnly: true }
```

### 9.3 Callables (`functions/src/referrals.ts`, region us-central1)
| Callable | Auth | Behaviour |
|---|---|---|
| `applyAsReferrer` | signed-in | Validates fields, blocks duplicates (`referrers/{uid}`), creates `pending`. If `autoApproveReferrers`, generates code immediately. |
| `validateReferralCode` | **public (auth optional)** | Uppercase + trim, looks up `referralCodes`, checks `active`, loads referrer rates, returns `{ valid, discountPct, finalAmount, referrerName }`. Never returns the doc itself. Rate-limit per IP/uid (in-memory map + 60 s window) to stop code enumeration. |
| `requestPayout` | referrer | Sums `qualified` referrals, enforces `minPayout`, creates `payouts` doc + marks referrals `pending → paid`-intent (`payoutId`), notifies admin. |
| `approveReferrer` / `suspendReferrer` / `regenerateCode` | admin | Status transitions + audit log + email. |
| `markPayoutPaid` | admin | Sets UTR, `paidAt`, updates referrals to `paid`, referrer totals, sends `payout-paid`. |

### 9.4 Trigger (`functions/src/referrals-triggers.ts`, region asia-south2)
```
onDocumentUpdated("enrollments/{enrollmentId}")
  before.status !== "approved" && after.status === "approved"
    → if after.referralCode:
        transaction:
          codeDoc = referralCodes/{CODE}; if !active → log + return
          if referrerId === after.userId → log "self-referral blocked" + return
          refId = `${referrerId}_${after.userId}_${after.courseId}`
          if exists → return (idempotent)
          commission = round(after.amountPaid * rate)
          create referral (status qualified)
          increment referrer totals
          upsert crmContact(lead) + activity "referral"
          email referrer + admin
  before.status === "approved" && after.status !== "approved"   (revoke)
    → if referral exists and status !== "paid": mark "reversed",
      decrement totals
      if status === "paid": flag `needsManualAdjustment: true` + admin email
```
Amount rules:
- `amountPaid` = discounted amount actually collected (never the list price).
- If `amountPaid` is missing on legacy docs → fall back to course price and flag `estimated: true`.
- Commission never negative; round to the nearest rupee.

### 9.5 Payments integration (the only risky part — touches live payment code)
1. `src/lib/types.ts` → `Enrollment` gains optional fields:
   `referralCode?: string; discountPct?: number; discountAmount?: number; grossAmount?: number; amountPaid?: number;`
2. `src/lib/course.ts` → `PaymentSubmissionData` gains `referralCode?`, `discountPct?`, `discountAmount?`, `grossAmount?`, `amountPaid?`; the `setDoc` at line 243 writes them only when present.
3. `firestore.rules` → extend `create` whitelist (line 219) and the student `update` branch (line 258) with the same five keys, each type/length-checked:
   ```
   && ( !('referralCode' in request.resource.data)
        || (request.resource.data.referralCode is string
            && request.resource.data.referralCode.size() <= 32) )
   && ( !('amountPaid' in request.resource.data)
        || (request.resource.data.amountPaid is number
            && request.resource.data.amountPaid >= 0) )
   ```
   Keep all existing checks intact — do not loosen `status`, `id`, or the UTR caps.
4. `src/app/courses/[slug]/pay/page.tsx` → read `?ref=` from `useSearchParams`, prefill the coupon field, call `validateReferralCode` on blur, show "Code applied — 10% off, you pay ₹X", disable the code field when invalid, and never let the client compute commission.
5. Admin `/admin/enrollments` → show discount + code chip and a mismatch warning if `amountPaid` ≠ the expected discounted total (admin still verifies the real UPI credit).

> ⚠️ **Rule-safety test before deploy:** new payment (create) · resubmit after rejection (update) · admin approve (update) · admin revoke (update) · student tampering with `discountAmount`. All five must behave as expected in the emulator.

### 9.6 Pages
- `/partners` — hero, how it works, earnings example, FAQ, CTA. Reuse `src/components/sections/*` styling.
- `/partners/apply` — form (react-hook-form + zod), success state explains the review timeline.
- `/partners/dashboard` — stat cards (leads, paid leads, earned, pending, paid), code + copy + QR + WhatsApp share button, referrals table, payout request dialog, payout history.
- `/admin/referrals` — tabs: Applications (approve/reject/suspend, edit rates), Referral ledger (filter by referrer/status/course), Payouts (mark paid with UTR), Settings (defaults in `appSettings/commissions`).

### 9.7 Fraud & edge cases
- Self-referral → blocked in the trigger and re-checked in `validateReferralCode` (referrer's own email/uid).
- Same lead + course already attributed → dedupe key returns early.
- Revoked enrollment → commission reversed; paid payouts flagged for manual adjustment.
- Suspended referrer → code deactivated immediately, existing qualified referrals stay payable.
- Refunded enrollment → treated as revocation (F4 calls the same reversal helper).
- Duplicate codes → retry code generation up to 5 times inside a transaction.
- Legacy/no `amountPaid` → fall back to course price, mark `estimated: true`.

### 9.8 Acceptance criteria
- [ ] New gym applies → admin approves → email with code arrives.
- [ ] Lead pays with code → discounted amount shown on pay page and stored.
- [ ] Admin approves → exactly one `referrals` doc, referrer totals correct, 2 emails sent.
- [ ] Approving the same enrollment twice never double-credits.
- [ ] Revoke → referral `reversed`, totals decremented.
- [ ] Payout request below `minPayout` rejected with a clear message.
- [ ] Referrer can see only their own referrals (rules enforced, verified with a second account).

---

## 10. F2 — CRM in the admin panel

### 10.1 Data model
```ts
// crmContacts/{sha256(lowercase(email))}
{
  contactId, name, email, phone?, city?, uid?,          // uid when an account exists
  source: "checklist" | "enquiry" | "referral" | "signup" | "payment" | "manual" | "import",
  stage: "new" | "contacted" | "qualified" | "payment_pending" |
         "enrolled" | "lost" | "alumni",
  ownerUid?, tags: string[],
  consent: { marketing: boolean, capturedAt, source, ipHash? },
  suppressed: boolean,                                   // mirrors email suppressions
  referralCode?, referrerId?,
  lifetimeValue, coursesPurchased: number,
  lastActivityAt, lastContactedAt?, nextTaskAt?,
  notesCount, createdAt, updatedAt
}

// crmActivities/{auto}
{ contactId, type: "note" | "call" | "email" | "whatsapp" | "stage_change" |
        "task" | "payment" | "referral" | "system",
  title, body?, actorUid, metadata?, createdAt }

// crmTasks/{auto}
{ contactId, title, dueAt, status: "open" | "done" | "snoozed",
  priority: "low" | "normal" | "high", assignedTo?, createdAt, completedAt? }
```

### 10.2 Screens
**`/admin/crm` — contact list**
- Table columns: name, email/phone, source, stage badge, owner, LTV, last activity, next task.
- Filters: free-text search (name/email/phone), stage, source, city, tag, marketing consent, date range.
- Bulk actions: add tag, change stage, export CSV, enroll in campaign.
- Saved views (chips): "New this week", "No activity 14 d", "Payment pending", "My contacts".
- Pagination via `limit(50)` + cursor; **no unbounded `getDocs()`**.

**`/admin/crm/[contactId]` — contact detail**
- Header: name, email, phone, stage dropdown, tags, owner, LTV, "Send email", "Log call", "Create task".
- Left: timeline of `crmActivities` (newest first) with inline "Add note".
- Right: open tasks, enrollments (`enrollments where userId == contact.uid`), referrals, consent status, email history (`emailLog where to == contact.email`).
- Every mutation writes an activity row (audit trail without extra work).

**`/admin/crm/pipeline` — Kanban**
- Columns = 7 stages, cards show name, course interest, LTV, task-due chip.
- Native HTML5 drag (`draggable`, `onDragStart/onDrop`) → updates `stage` + writes `stage_change` activity. A stage `<select>` on each card is the keyboard/mobile fallback (D7).
- Column headers show count + value sum.

**`/admin/campaigns` — email campaigns**
- Compose (subject, HTML or simple block editor), pick segment, preview, send test, send.
- Lists `emailCampaigns` with delivered/opened/clicked/bounced counters from the Brevo webhook.
- Shows `emailLog` failures + the suppression list (with a "remove suppression" admin action).

### 10.3 Queries needing indexes
| Collection | Index |
|---|---|
| `crmContacts` | `stage ASC, updatedAt DESC` |
| `crmContacts` | `source ASC, createdAt DESC` |
| `crmContacts` | `tags` (`arrayConfig: "CONTAINS"`) + `updatedAt DESC` |
| `crmContacts` | `ownerUid ASC, updatedAt DESC` |
| `crmContacts` | `nextTaskAt ASC` (global task feed) |
| `crmActivities` | `contactId ASC, createdAt DESC` |
| `crmTasks` | `status ASC, dueAt ASC` |
| `crmTasks` | `contactId ASC, status ASC, dueAt ASC` |
| `referrals` | `referrerId ASC, createdAt DESC` |
| `referrals` | `status ASC, createdAt DESC` |
| `referrals` | `leadUid ASC, courseId ASC` |
| `payouts` | `referrerId ASC, requestedAt DESC` |
| `payouts` | `status ASC, requestedAt DESC` |
| `emailLog` | `to ASC, createdAt DESC` |
| `emailLog` | `template ASC, createdAt DESC` |
| `invoices` | `userId ASC, issuedAt DESC` |
| `refunds` | `status ASC, requestedAt DESC` |

Add all of these to `firestore.indexes.json` in the same `{collectionGroup, queryScope: "COLLECTION", fields: [...]}` shape already used there.

> Firestore composite indexes with an array field must use `{ "fieldPath": "tags", "arrayConfig": "CONTAINS" }` instead of `"order"` — the emulator will reject `"order"` on an array field.

### 10.4 Automations (push data in, don't ask admins to type it)
| Trigger | Action |
|---|---|
| `onDocumentCreated checklistEnquiries/{id}` | Upsert contact (`source: checklist`, `stage: new`), send `checklist-delivery`, create task "Follow up in 2 days" |
| `onDocumentCreated users/{uid}` | Upsert contact if the user verified their email (`source: signup`, `stage: new`) |
| `onDocumentWritten enrollments/{id}` | Submitted → stage `payment_pending`; approved → `enrolled`, LTV += `amountPaid`; rejected → `qualified` + task |
| `onDocumentCreated referrals/{id}` | Tag contact with `referrerId`, activity `referral`, stage `enrolled` |
| `onDocumentUpdated crmContacts` | Mirror `suppressed` from `suppressions`; refresh `lastActivityAt` |
| Daily 09:00 IST `crmTaskReminders` | Email/Slack-style digest to admins: overdue + due-today tasks |

### 10.5 Reports (top of `/admin/crm`)
- Leads by source (bar), leads per day (line, 30 d), stage funnel (converted %), revenue by course, revenue + commission by referrer, average time-to-enrollment.
- All computed with `recharts` from bounded queries (last 90 days by default) — no client-side full-collection scans.

### 10.6 Acceptance criteria
- [ ] Existing checklist submissions appear automatically as contacts (no manual import).
- [ ] Search by email finds the contact created from an enquiry within seconds.
- [ ] Dragging a card in the pipeline persists the stage after refresh and logs an activity.
- [ ] Contact detail shows enrollments, referral credit and email history.
- [ ] CSV export respects the active filters.
- [ ] A non-admin hitting `/admin/crm` is redirected by middleware (verify with a student account).

---

## 11. F3 — Completion certificates

**Eligibility (default, configurable in `appSettings/billing` or `appSettings/certificates`):**
approved enrollment **and** 100 % content completion in `progress/{uid}_{courseId}` **and** every course quiz passed.

### Data model
```ts
// certificates/{uid}_{courseId}
{ userId, courseId, holderName, courseTitle, courseSlug,
  issuedAt, verificationId,        // 10-char base32, e.g. "K7F2Q9M4XZ"
  pdfPath: "certificates/{uid}/{courseId}.pdf",
  revoked: false, revokedAt?, revokeReason?,
  completionPct: 100, quizAverage }
```

### Implementation
- **PDF:** `pdf-lib` (functions dep). A4 **landscape**, brand background, holder name in a large serif, course title, issue date (`Asia/Kolkata`, `dd MMM yyyy`), signature line, verification ID, QR code.
  - ⚠️ **`pdf-lib` standard fonts cannot render `₹` or Devanagari.** Use `Rs.` or embed `NotoSans-Regular.ttf` (ship the file in `functions/assets/`, load with `pdfDoc.embedFont(bytes, { subset: true })`). Never rely on Helvetica for names with accents.
- **QR:** `qrcode` (functions dep) → PNG data URL → `embedPng`. Target: `${SITE_URL}/verify/${verificationId}`.
- **Storage:** write to `certificates/{uid}/{courseId}.pdf`; add a `storage.rules` block: owner read, admin read, **no public write**.
- **Callables:** `issueCertificate` (idempotent — returns the existing cert if present; re-issues only when `force` + admin), `getCertificateDownloadUrl` (signed URL, 7 days, owner/admin), `verifyCertificate` (public, returns `{ valid, holderName, courseTitle, issuedAt, revoked }` only — never email/uid).
- **Trigger:** `onDocumentWritten progress/{id}` → if completion hits 100 % and eligibility passes → issue + email `certificate-issued`.
- **Pages:** `/verify/[id]` public result page (green tick / red revoked card, no PII), plus a "Certificate" card on `/dashboard` and a download button on the course-complete screen.
- **Email:** link to the verification page (not an attachment) for deliverability.

### Acceptance criteria
- [ ] Completing 100 % of content auto-issues exactly one certificate.
- [ ] Certificate PDF opens, QR scans to `/verify/{id}`, name renders with `₹`/accents if used.
- [ ] `/verify/{id}` works logged out and shows nothing but name + course + date.
- [ ] Revoked certificate shows "revoked" publicly and blocks the signed download.

---

## 12. F4 — Receipts / GST invoices + refunds

### 12.1 Legal nuance (decide before coding)
- **Not GST-registered (default):** issue a **"Payment Receipt"** — no tax columns, no GSTIN, no "Tax Invoice" wording.
- **GST-registered:** issue a **"Tax Invoice"** with GSTIN, HSN/SAC (`9992` — education services), CGST/SGST split (intra-state) or IGST (inter-state), place of supply.
- `appSettings/billing.gstEnabled` switches the template; never print a GSTIN you don't have.
- Invoices are issued for **money actually received** (`amountPaid`), never the list price.

### 12.2 Data model
```ts
// invoices/{auto}
{ number: "KNT/2026-27/0001",          // FY prefix from appSettings
  userId, enrollmentId, courseId, courseTitle,
  grossAmount, discountAmount, amountPaid,
  taxableValue, gstRate, cgst, sgst, igst, total,
  placeOfSupply, gstEnabled,
  buyer: { name, email, phone?, address?, gstin? },
  status: "issued" | "cancelled" | "refunded",
  issuedAt, pdfPath, createdBy }

// counters/invoices-2026-27   → { seq: number }
// refunds/{auto}
{ enrollmentId, userId, invoiceId, amount, reason,
  status: "requested" | "approved" | "rejected" | "processing" | "completed",
  revokeAccess: boolean, requestedAt, approvedAt, approvedBy,
  utr?, completedAt, notes }
```

### 12.3 Numbering (must be gap-free and race-free)
```ts
await db.runTransaction(async (tx) => {
  const counterRef = db.doc(`counters/invoices-${fy}`);   // e.g. 2026-27, Apr–Mar
  const snap = await tx.get(counterRef);
  const next = (snap.exists ? snap.data()!.seq : 0) + 1;
  tx.set(counterRef, { seq: next }, { merge: true });
  tx.set(invoiceRef, { number: `${prefix}/${fy}/${String(next).padStart(4, "0")}` , ... });
});
```
- Cancelling **keeps the number** and sets `status: "cancelled"` — never reuse or delete.
- FY boundary: 1 April, `Asia/Kolkata`.

### 12.4 PDF
- `pdf-lib`, A4 **portrait**, logo, seller block from `appSettings/billing.seller`, buyer block, line items table, totals, amount in words, "computer-generated invoice" footer.
- Storage at `invoices/{userId}/{number}.pdf` (replace `/` with `-` in the file name).
- Same font caveat as certificates: use `Rs.` or embed NotoSans.

### 12.5 Refund workflow
```
Admin: /admin/payments → select payment → "Refund"
  → amount (default full), reason, "revoke access" checkbox
  → refunds/{id} status "approved"
  → admin marks "completed" with UTR
      → invoice.status = "refunded"
      → if revokeAccess: enrollment.status = "rejected" (audit log)
          → referral reversal trigger fires automatically (F1 §9.4)
      → email "refund-processed"
      → adminAuditLog entry
```
No student-initiated refunds in Phase 2 (support conversations happen over WhatsApp/email). Document that explicitly in the T&Cs.

### 12.6 Pages & exports
- `/admin/payments` tabs: **Payments** (search by student/course/UTR/date), **Invoices** (view/download/re-issue/cancel), **Refunds**, **Summary** (revenue by month/course, refunds, net).
- Student: "Receipt" button on `/dashboard` per course → signed URL download.
- Admin CSV export of invoices for the accountant (GSTR-ready columns when `gstEnabled`).

### 12.7 Acceptance criteria
- [ ] Approving an enrollment issues exactly one invoice with a sequential number (two simultaneous approvals never collide).
- [ ] Re-approving/retrying never creates a duplicate invoice (deterministic check: one invoice per `enrollmentId`).
- [ ] Receipt PDF opens, shows correct amount, name and number; `Rs.` renders.
- [ ] Refund → invoice `refunded`, access revoked when chosen, referral reversed, email sent.
- [ ] Student can download only their own receipts (rules verified with a second account).

---

## 13. Firestore rules — required changes

### 13.1 `enrollments` (edit only, don't rewrite)
Add the five referral keys to the `create` whitelist at `firestore.rules:219` and to the student `update` branch at `firestore.rules:258`:
`referralCode`, `discountPct`, `discountAmount`, `grossAmount`, `amountPaid`.
Then add the type guards from §9.5 immediately after each whitelist. The admin update branch (line 251) stays untouched — admins approve, they don't re-price.

### 13.2 New blocks (append inside `match /databases/{database}/documents { ... }`)
```
    // ------------------------------------------------------------------
    // Phase 2: referrals
    // ------------------------------------------------------------------
    match /referrers/{uid} {
      allow get, list: if request.auth != null && (request.auth.uid == uid || isAdmin());

      // Self-application only, fixed shape, always starts "pending".
      allow create: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.userId == uid
        && request.resource.data.status == 'pending'
        && request.resource.data.type in ['gym', 'individual']
        && request.resource.data.keys().hasOnly(['userId', 'type', 'businessName', 'contactName',
             'email', 'phone', 'city', 'payout', 'status', 'createdAt', 'notes'])
        && request.resource.data.businessName is string
        && request.resource.data.businessName.size() > 0
        && request.resource.data.businessName.size() <= 120
        && request.resource.data.contactName is string
        && request.resource.data.contactName.size() <= 120
        && request.resource.data.email is string
        && request.resource.data.email.size() <= 200
        && request.resource.data.phone is string
        && request.resource.data.phone.size() <= 20
        && request.resource.data.createdAt is timestamp;

      // Owners may only keep their contact/payout details current once active.
      // Codes, rates, status and totals are callable/admin territory.
      allow update: if request.auth != null && (
        isAdmin()
        || (request.auth.uid == uid
            && resource.data.status == 'active'
            && request.resource.data.diff(resource.data).affectedKeys()
                 .hasOnly(['businessName', 'contactName', 'phone', 'city', 'payout', 'notes']))
      );
      allow delete: if isAdmin();
    }

    // Codes are never client-readable (scraping). validateReferralCode() uses
    // the Admin SDK. No allow block = default deny.
    match /referralCodes/{code} {
      allow read, write: if false;
    }

    // Written only by the enrollment-approval trigger; ids are deterministic.
    match /referrals/{referralId} {
      allow get, list: if request.auth != null && (
        request.auth.uid == resource.data.referrerId
        || request.auth.uid == resource.data.leadUid
        || isAdmin()
      );
      allow create, update, delete: if false;
    }

    // Payouts are created by the requestPayout callable so the amount is
    // always derived server-side from qualified referrals.
    match /payouts/{payoutId} {
      allow get, list: if request.auth != null && (
        request.auth.uid == resource.data.referrerId || isAdmin()
      );
      allow create, update, delete: if false;
    }

    // ------------------------------------------------------------------
    // Phase 2: CRM (admin-only; Cloud Functions bypass rules)
    // ------------------------------------------------------------------
    match /crmContacts/{contactId}   { allow read, write: if isAdmin(); }
    match /crmActivities/{activityId} { allow read, write: if isAdmin(); }
    match /crmTasks/{taskId}         { allow read, write: if isAdmin(); }

    // ------------------------------------------------------------------
    // Phase 2: certificates, invoices, refunds — server-written
    // ------------------------------------------------------------------
    match /certificates/{certId} {
      allow get, list: if request.auth != null && (
        request.auth.uid == resource.data.userId || isAdmin()
      );
      allow write: if false;
    }
    match /invoices/{invoiceId} {
      allow get, list: if request.auth != null && (
        request.auth.uid == resource.data.userId || isAdmin()
      );
      allow write: if false;
    }
    match /refunds/{refundId} {
      allow get, list: if request.auth != null && (
        request.auth.uid == resource.data.userId || isAdmin()
      );
      allow write: if false;
    }

    // ------------------------------------------------------------------
    // Phase 2: email + settings + audit (admin read, server write)
    // ------------------------------------------------------------------
    match /emailLog/{logId}          { allow read: if isAdmin(); allow write: if false; }
    match /emailCampaigns/{campaignId} { allow read: if isAdmin(); allow write: if false; }
    match /suppressions/{emailHash}  { allow read: if isAdmin(); allow write: if false; }
    match /counters/{counterId}      { allow read: if isAdmin(); allow write: if false; }
    match /adminAuditLog/{logId}     { allow read: if isAdmin(); allow write: if false; }
    match /appSettings/{settingId}   { allow read: if isAdmin(); allow write: if false; }
```
> `appSettings` is admin-only because it holds commission rates and payout rules. The public learn page never needs it.

### 13.3 `storage.rules`
Functions write PDFs with the Admin SDK (rules bypassed). Add owner-read only as a fallback:
```
    match /certificates/{uid}/{file} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
    match /invoices/{uid}/{file} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
```
(The primary path is a 7-day signed URL from a callable, so downloads work even if rules change.)

---

## 14. Execution checklist (work top to bottom)

### Phase 0 — setup (0.5 d)
- [ ] Create Brevo account, verify `learnkinetika.com` sender, add SPF/DKIM/DMARC (client DNS access needed).
- [ ] `cd functions && npm i pdf-lib qrcode && npm i -D @types/qrcode` (F3/F4 only).
- [ ] Add env vars to `functions/.env` + document in `functions/.env.example` (no secrets committed).
- [ ] Seed `appSettings/commissions` and `appSettings/billing` (script or console).
- [ ] Confirm `firebase use` project + that `firebase deploy --only functions` still builds clean.

### Phase 1 — F0 email foundation (2–3 d)
- [ ] `functions/src/email/brevo.ts` (send, retry, suppression check, log).
- [ ] `functions/src/email/templates.ts` (shell + 13 templates).
- [ ] `functions/src/email/index.ts` (`sendTestEmail`, `sendCampaign`, `brevoWebhook`, `unsubscribe`).
- [ ] Register exports in `functions/src/index.ts`.
- [ ] `emailLog` + `suppressions` rules; webhook token check.
- [ ] `/admin/campaigns` minimal page (send test + compose/send + log table).
- [ ] QA: deliverability, idempotency, bounce → suppression.

### Phase 2 — F1 referrals (4–5 d)
- [ ] `functions/src/referrals.ts` (5 callables) + `referrals-triggers.ts`.
- [ ] `src/lib/referrals.ts` + types.
- [ ] `src/lib/course.ts` payment fields; `src/lib/types.ts` `Enrollment` fields.
- [ ] `firestore.rules` enrollment whitelist + new blocks.
- [ ] `/partners`, `/partners/apply`, `/partners/dashboard`.
- [ ] `/admin/referrals` (4 tabs).
- [ ] `/courses/[slug]/pay` coupon field + `?ref=` handling; `/admin/enrollments` discount chip.
- [ ] Navbar + `sitemap.ts` entries.
- [ ] QA: rule-safety matrix (§9.5), double-approve, self-referral, revoke.

### Phase 3 — F5 notifications (0.5–1 d)
- [ ] `notifications.ts` + wire into the enrollment create/update triggers.
- [ ] Reminder scheduled job + dedupe.
- [ ] QA: every event lands one email per recipient.

### Phase 4 — F2 CRM (5–6 d)
- [ ] `functions/src/crm.ts` + `crm-triggers.ts` (backfill existing `checklistEnquiries` + `users`).
- [ ] `src/lib/crm.ts` + types; indexes into `firestore.indexes.json`.
- [ ] `/admin/crm` list + filters + saved views + CSV export.
- [ ] `/admin/crm/[contactId]` detail + timeline + tasks.
- [ ] `/admin/crm/pipeline` Kanban (DnD + dropdown fallback).
- [ ] Reports block with recharts.
- [ ] Admin nav cards.
- [ ] QA: automation backfill, stage persistence, non-admin redirect, no unbounded reads.

### Phase 5 — F4 billing (3–4 d)
- [ ] `functions/src/billing.ts` (invoice transaction, PDF, refund callables).
- [ ] Issue invoice on enrollment approval (single handler alongside F1 to avoid duplicate triggers).
- [ ] `/admin/payments` (4 tabs) + student receipt download.
- [ ] Rules + storage rules.
- [ ] QA: sequential numbering under concurrency, no duplicate invoice, refund → reversal.

### Phase 6 — F3 certificates (2–3 d)
- [ ] `functions/src/certificates.ts` + `progress` trigger.
- [ ] `pdf-lib` + `qrcode` rendering, NotoSans asset if names need it.
- [ ] `/verify/[id]` public page, dashboard card, download button.
- [ ] Rules + storage rules.
- [ ] QA: 100 % completion, QR scan, revoked state, logged-out verification.

### Phase 7 — hardening & launch (1–2 d)
- [ ] `npm run typecheck` + `npm run build` clean.
- [ ] `cd functions && npm run build` clean.
- [ ] Deploy indexes **before** functions that need them.
- [ ] Deploy rules, functions, then the App Hosting frontend.
- [ ] Update `docs/PRODUCTION_READINESS.md` + `docs/DPDP_COMPLIANCE_PLAN.md` (consent, suppression, retention).
- [ ] Handover doc: admin how-to (approve referrer, pay out, refund, send campaign).

---

## 15. QA matrix (emulator first, then staging)

| # | Scenario | Expected |
|---|---|---|
| 1 | Fresh payment, no code | `pending` enrollment, student + admin emails, no `referrals` doc |
| 2 | Payment with valid code | `amountPaid` = discounted, code stored, discount shown to admin |
| 3 | Payment with invalid/expired code | Code rejected on the pay page; no discount silently applied |
| 4 | Student edits `discountAmount` from the console | Rules deny the write |
| 5 | Admin approves twice | One referral, one invoice, one email set (no duplicates) |
| 6 | Admin revokes an approved enrollment | Referral reversed, totals decremented, invoice stays issued |
| 7 | Two approvals at the same second | Sequential invoice numbers, no gap, no collision |
| 8 | Referrer reads another referrer's referral doc | Permission denied |
| 9 | Payout below minimum | Callable returns a clear error, no `payouts` doc |
| 10 | Admin marks payout paid | Referral `paid`, `payout-paid` email, totals updated |
| 11 | Student hits `/admin/crm` | Redirected by middleware |
| 12 | Checklist form submitted | CRM contact + task + delivery email |
| 13 | Campaign to a segment containing a suppressed address | Suppressed address skipped, stats exclude it |
| 14 | Brevo hard-bounce webhook | `suppressions` row + next send blocked |
| 15 | Certificate issued at 100 % completion | One PDF, QR resolves logged out |
| 16 | Refund completed with revoke | Enrollment `rejected`, access lost, referral reversed, email sent |
| 17 | Legacy enrollment without `amountPaid` approved | Referral created with `estimated: true`, no crash |

---

## 16. Deployment & operations

```bash
# functions
cd functions && npm run build && cd ..
firebase deploy --only functions

# rules + indexes (indexes first if a query would otherwise fail)
firebase deploy --only firestore:indexes
firebase deploy --only firestore:rules,storage
```
- Frontend ships via Firebase App Hosting (`apphosting.yaml`); keep `NEXT_PUBLIC_*` in the App Hosting env, never in the repo.
- Brevo webhook URL: `https://us-central1-<project>.cloudfunctions.net/brevoWebhook` — subscribe to `delivered/opened/clicked/hard_bounce/spam/unsubscribed`.
- Monitor: `firebase functions:log --only <fn>`, `emailLog` failures, `adminAuditLog`.
- Rollback: rules and functions deploy independently. Commit `firestore.rules` before touching the enrollment whitelist so the payment path can be reverted in one command.

---

## 17. Risks & gotchas (read before acting)

| Risk | Mitigation |
|---|---|
| **Enrollment rules regression kills payments** — the whitelist is the highest-risk edit in this plan | Full 5-case emulator test (§9.5) before every rules deploy; keep the old rules in git |
| Trigger retries double-credit commissions | Deterministic referral ID + `runTransaction` + existence check |
| Duplicate invoice numbers under concurrency | Transaction on `counters/invoices-{FY}` only, never a client-side counter |
| `pdf-lib` can't render `₹`/Devanagari | Use `Rs.` or embed NotoSans; test with an accented name |
| Brevo free tier (300/day) silently fails campaigns | Chunk + backoff + surface failures in the UI; upsell a paid plan |
| Emails land in spam on launch | SPF/DKIM/DMARC + warm-up + plain-text alternative; don't blast the whole list on day 1 |
| Coupon codes scraped/enumerated | `referralCodes` is never client-readable; callable with rate limiting |
| Self-referral / fake gyms | Admin approval, self-referral block, min payout, UTR-verified settlement |
| DPDP violation via marketing email | Consent captured in `crmContacts.consent`, unsubscribe on every marketing mail, suppressions honored |
| Unbounded CRM reads slow the admin panel | `limit(50)` + cursors + the indexes in §10.3 |
| Commission maths drifting from what was promised | Rates snapshotted onto the referral at creation, never recalculated later |
| `appSettings` seeded wrong → wrong discounts | Seed script + an admin Settings tab with validation, plus a visible "current rates" banner |
| Cron timezone bugs | Always `timeZone: "Asia/Kolkata"`; store Timestamps, format with `date-fns` |
| Functions cold-start latency on approval emails | 256–512 MiB, `minInstances: 0` is fine; emails are fire-and-forget inside the trigger |

---

## 18. Explicitly out of scope (Phase 2)

Auto-payment gateway (Razorpay/Stripe) · WhatsApp Business API automation · SMS · mobile app · multi-language UI · affiliate multi-level/tiered commissions · student-initiated refunds · coupons other than referral codes (e.g. festival sales) · live classes/webinars · instructor accounts/roles · email drag-and-drop builder · accounting software sync (Tally/Zoho) · DPDP data-deletion self-service.

Quote these separately if asked (Razorpay integration alone ≈ 3–4 d).

---

## 19. Session log

| Date | What happened |
|---|---|
| 2026-10-23 | Full repo exploration, Brevo/CRM research, Phase 2 plan + pricing delivered, product-gap audit (~30 items) shared, WhatsApp summary + quote prepared. No code changed. |
| _next_ | _Resume here: confirm D1–D9, pick package, then start Phase 0._ |

### Product gap audit (Tier 0 — marketed but not built, biggest trust/legal risk)
Certificates · private community access · refund policy enforcement · receipts/invoices. These four are promised on the site and do not exist — ship them before any growth feature.

### Resume prompt (paste into a new chat)
```
Read PHASE2_IMPLEMENTATION_PLAN.md at the repo root and continue from §14.
Decisions confirmed: <D1..D9 answers>. Package: <Starter|Growth|Complete>.
Start with Phase 0 and Phase 1 (F0 Brevo foundation).
```

