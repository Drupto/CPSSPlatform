# DPDP Compliance Plan — KINÉTIKA (learnkinetika.com)

> **Version:** 1.0 · **Date:** 2026-09-07 · **Status:** Approved for implementation
> **Scope:** learnkinetika.com (KINÉTIKA / Parmitrain CSCS Exam Prep) — codebase `CPSSPlatform` @ `2bee668`, branch `FirebaseIntegration`
> **Role:** Platform operator = **Data Fiduciary** · Users = **Data Principals**
> **Statutory horizon:** DPDP Rules 2025 fully effective **13 May 2027**; Rule 4 (Consent Managers) **13 Nov 2026**
> **Companion docs:** `SECURITY_AUDIT.md`, `docs/PRODUCTION_READINESS.md`, `docs/SEO.md`

---

## 1. Executive Summary

**Verdict:** The platform is **not yet DPDP-compliant**. A code-level audit found **16 gaps** (3 critical, 6 high, 5 medium) concentrated in four areas:

1. The privacy notice is generic and not DPDP-grade (no itemization, no withdrawal/rights/Board links, factually inaccurate claims).
2. There is no consent capture, no consent record, no withdrawal mechanism.
3. Data principals have no rights tooling — no erasure, no export, no email correction, no grievance channel, no nomination.
4. Breach response, retention schedules, and children's-data gating do not exist.

The security baseline is strong (Edge middleware admin gating, tight Firestore/Storage rules, enforced email verification, India-region data residency, no trackers) — remediation is therefore **well-scoped, non-blocking, and buildable on existing patterns** (the `onCourseDelete` cascade deletion function is the exact template the user-erasure flow needs).

**Obligation status at a glance:**

| Obligation | Legal basis | Status today |
|---|---|---|
| Itemized, standalone notice with withdrawal/rights/Board links | s.5, Rule 3 | ❌ Generic policy |
| Unambiguous, informed, **recorded** consent + easy withdrawal | s.6, Rule 3 | ❌ Bundled ToS link |
| Erasure on purpose-lapse/withdrawal + **48-hr pre-erasure notice** | s.8(7), Rule 8 | ❌ No deletion flow |
| Access to data + processing summary | s.11 | ❌ Absent |
| Correction/completion/updating | s.12 | ◐ Name only; email locked |
| Grievance officer published + response window | s.13 | ❌ Absent |
| Nomination | s.14 | ❌ Absent |
| Security safeguards (encryption, access control, 1-yr log retention, backups) | s.8(5), Rule 6 | ◐ Partial |
| Breach: user notice "without delay"; Board + **72-hr detailed report** | s.8(6), Rule 7 | ❌ No runbook |
| Children (<18): no tracking/targeted ads; verifiable parental consent | s.9, Rule 10 | ❌ No age gate |
| Cross-border transfer + processor disclosure | s.8(2), Rule 15 | ◐ Undisclosed |
| Consent Manager interoperability | Rule 4 | ❌ Not designed |

**Regulatory clock** (DPDP Rules 2025, notified 13 Nov 2025, G.S.R. 846(E)):

| Phase | Date | In force |
|---|---|---|
| 1 | 13 Nov 2025 (**live**) | Rules 1, 2, 17–21 — Board constitution, definitions |
| 2 | **13 Nov 2026** | Rule 4 — Consent Managers |
| 3 | **13 May 2027** | Rules 3, 5–16, 22–23 — **all substantive obligations** |

**Plan:** 7 phases, ≈4–6 weeks of part-time engineering + one fixed-scope legal review of the final notice text. Every item is ticketed with exact file paths (§5) and consolidated into a file-by-file change map (§6). Appendix A = retention schedule, Appendix B = breach runbook, Appendix C = data schemas, Appendix D = copy templates.

---

## 2. Regulatory Context

### 2.1 The framework

| Instrument | Detail |
|---|---|
| **DPDP Act, 2023** | Parent statute (44 sections). Rights, fiduciary duties, penalties, and the Data Protection Board of India ("the Board"). |
| **DPDP Rules, 2025** | Implementing regulations (23 rules, 7 schedules). Notified **13 Nov 2025**, Gazette **G.S.R. 846(E)**. Operational detail for consent, notice, security, breach, retention, children, cross-border. |

### 2.2 Enforcement phases (Rule 1, DPDP Rules 2025)

| Phase | Date | Rules in force | Impact on this plan |
|---|---|---|---|
| 1 | 13 Nov 2025 (**live now**) | Rules 1, 2, 17–21 | Board constituted; definitions ("techno-legal measures", "user account", "verifiable consent"). No new fiduciary duty yet. |
| 2 | **13 Nov 2026** | Rule 4 | Consent Manager registration opens (₹2 crore net worth, interoperability standards, First Schedule duties). Fiduciaries must be able to interface with registered Consent Managers. |
| 3 | **13 May 2027** | Rules 3, 5–16, 22–23 | **Everything substantive**: notice (R3), security safeguards (R6), breach notification (R7), retention & erasure (R8), children & persons with disabilities (R10), grievance redressal timelines, cross-border (R15), rights fulfilment. |

**Implication:** No statutory enforcement exposure until 13 May 2027, but consent infrastructure, policy rewrites, and rights tooling need lead time — and Phase 2 lands in ~2 months. Building now is cheap; retrofitting in 2027 under Board scrutiny is not.

### 2.3 Roles under the Act

| Role | Who |
|---|---|
| **Data Fiduciary** | The entity operating learnkinetika.com (KINÉTIKA / Parmitrain). Determines purpose and means of processing. |
| **Data Principal** | Every registered user; any visitor whose personal data is processed. |
| **Data Processor** | Google (Firebase/GCP), Gemini API, YouTube (embedded player), PayPal (payer-side), hosting provider. |
| **Consent Manager** | Registered intermediary through which users may give/manage consent (Rule 4). Not required for this platform to *be* one — only to interoperate eventually. |
| **Board** | Data Protection Board of India — adjudicates breaches; users may complain to it (must be linked in every notice). |

### 2.4 Why KINÉTIKA is NOT a Significant Data Fiduciary (SDF)

SDF designation (s.10) requires Central Government notification based on volume/sensitivity of personal data, risk to data principals, impact on sovereignty/security, electoral risk, or public order. This platform: niche B2C professional-exam-prep audience, small user base, no sensitive-category data (no health, financial-account, biometric, or government-ID data), no behavioural advertising, no profiling of children.

| SDF obligation | Applies? |
|---|---|
| Data Protection Officer (India-based, reports to governing body, grievance point-of-contact) | ❌ Not required |
| Independent data auditor | ❌ Not required |
| Periodic DPIA + audit | ❌ Not required |
| **All core Data Fiduciary duties (s.4–9, 11–16)** | ✅ **Fully apply** |

> **Re-assessment trigger:** re-evaluate if the platform later processes data at large scale, adds sensitive-category data, or is notified by MeitY. A named "such other person" under s.13 (Grievance Officer-equivalent) **is** required — that is the Grievance Officer appointed in Phase 0.

### 2.5 Penalty exposure (DPDP Act, Schedule)

| Violation | Max penalty |
|---|---|
| Failure to take reasonable security safeguards (s.8(5)) | **₹250 crore** |
| Failure to notify a personal-data breach (s.8(6) / Rule 7) | **₹200 crore** |
| Breach of children's-data obligations (s.9 / Rule 10) | **₹200 crore** |
| SDF-only obligations (s.10) | ₹150 crore |
| Non-observance of fiduciary duties generally (s.8) | up to ₹50 crore |

> Penalties are assessed by the Board considering gravity, duration, repeat nature, diligence shown, and gains from non-compliance. The ₹250 Cr / ₹200 Cr ceilings make **Phase 4 (security) and Phase 6 (breach readiness)** non-optional even for a small platform.

### 2.6 Key obligation cheat-sheet → mapped to phases

| Provision | Obligation (condensed) | Closed by |
|---|---|---|
| s.5 + Rule 3 | Notice: **itemized** personal data + specific purposes; standalone; clear & plain language; must carry how to **withdraw consent (as easily as given)**, **exercise rights**, **complain to the Board**; applies to new AND pre-existing (grandfathered) consent | Phase 1 |
| s.6 + Rule 3 | Consent: unambiguous, specific, informed, by clear affirmative action; **record kept**; withdrawal as easy as giving; ToS acceptance is NOT consent | Phase 2 |
| s.6(4)/(7) | On withdrawal: cease processing, erase unless legal retention applies | Phase 2 + 3 |
| s.8(2) + Rule 15 | Cross-border transfer permitted except to countries on the Central Government's negative list; processors bound by contract; **disclosure in notice** | Phase 0 + 1 |
| s.8(5) + Rule 6 | Security safeguards: encryption/tokenisation, access control, **logs monitored & retained ≥ 1 year**, backups, contractual processor terms | Phase 4 |
| s.8(6) + Rule 7 | Breach: notify each affected data principal **without delay** (self-contained intimation: nature, extent, timing, mitigation); Board **without delay** + detailed report **within 72 hours** | Phase 6 |
| s.8(7) + Rule 8 | Erase on purpose-lapse / consent-withdrawal unless legal retention applies; publish retention schedule in notice; **48-hour notice before erasure** | Phase 0 + 3 |
| s.9 + Rule 10 | Children (<18): no tracking, behavioural monitoring, or targeted advertising directed at children; verifiable parental consent (DigiLocker / registered Consent Manager / equivalent) | Phase 2 + 5 |
| s.11 | Access: summary of personal data, processing activities, processor identities | Phase 3 |
| s.12 | Correction, completion, updating, **erasure** | Phase 3 |
| s.13 | Publish grievance-redressal details; respond within the prescribed window | Phase 1 + 3 |
| s.14 | Nomination: accept nominations; nominee may exercise s.11–13 rights on death/incapacity | Phase 3 |
| Rule 4 | Interoperable interface for registered Consent Managers (from 13 Nov 2026) | Phase 7 |
| Rule 3 languages | Government may prescribe notice availability in Eighth-Schedule languages (22) | Phase 7 (contingency) |

---

## 3. Personal Data Audit (as-built)

> Audit basis: codebase @ `2bee668` (branch `FirebaseIntegration`), production URL `https://learnkinetika.com`. Cross-references: `SECURITY_AUDIT.md`, `docs/PRODUCTION_READINESS.md`.

### 3.1 Data inventory

| # | Personal data | Collected at | Stored in | Purpose | Sensitivity / note |
|---|---|---|---|---|---|
| 1 | **Email address** (mandatory, verified) | `src/app/auth/page.tsx` (signup/signin/reset) | Firebase Auth + `users/{uid}.email` | Account identity, verification emails, password reset, admin quiz analytics display | Core identifier |
| 2 | **Display name** (mandatory — `src/lib/profile-check.ts` gate on every gated page) | `/dashboard/profile` | Firebase Auth profile + `users/{uid}.displayName` | Personalization; admin quiz analytics ("User name and email" per `ADMIN_ANALYTICS_EXPLANATION.md`) | Core identifier |
| 3 | **Payment method + transaction reference** (UPI txn ID / PayPal reference, 4–100 chars) | `/courses/[slug]/pay` → `submitPaymentRequest()` | `enrollments/{uid}_{courseId}`: `paymentMethod`, `paymentReference`, `paymentSubmittedAt` | Manual payment verification by admin before enrollment approval | **Financial** (transaction identifiers); retained indefinitely today → G12 |
| 4 | **Learning progress** (`completedContentIds[]`, cap 1000) | `/courses/[slug]/learn` | `progress/` (`id, userId, courseId, completedContentIds, updatedAt`) | Course progress tracking | Behavioural |
| 5 | **Quiz performance** (answers array, score %, pass/fail, started/completed timestamps) | Cloud Functions `startQuizAttempt` / `submitQuizAttempt` (server-side only) | `quizAttempts/`, `quizSessions/` | Assessment, admin analytics (averages, pass rate, per-question breakdown) | Behavioural |
| 6 | **AI tutor inputs** (user-typed topic/snippet ≤2000 chars; optional outline ≤8000) | `src/components/sections/ai-tutor.tsx` → `examPrepAIAssistant` (Genkit → **Google Gemini API**) | Not persisted by us; processed by Google | Marketing/utility tool (summarize topics, generate practice questions) | User-generated; **may contain PII**; anonymous & undisclosed today → G14 |
| 7 | **Session token** | `src/components/auth-cookie-sync.tsx` | `__session` cookie (Firebase ID token; `samesite=lax`, `secure` on https, max-age 3600) | Authentication; Edge middleware admin gating (`src/middleware.ts`) | Strictly necessary credential |
| 8 | **IP / infrastructure logs** | Google (Firebase/GCP) platform | Google Cloud Logging (retention unmanaged today) | Security, abuse prevention, operations | Metadata → G10 (1-year retention policy needed) |
| 9 | **Viewer data via YouTube embeds** | Course videos + homepage video section | Google/YouTube (third party) | Course content delivery | Behavioural (third-party cookies possible) → G13 |
| 10 | **Testimonial names, locations, photos** (real persons: "Amarendra Singh", "Tulika Singh", "Abdullah", "Salman") | Hardcoded in `src/components/sections/testimonials.tsx` | Website source / git | Marketing | **Published personal data — consent record must exist** → G16 |

**Explicitly NOT collected:** phone numbers, dates of birth, government IDs (Aadhaar/PAN), health or biometric data, precise geolocation, contacts, advertising profiles, marketing subscriptions.

**Firebase Analytics:** `measurementId` exists in `src/lib/firebase.ts` config but `getAnalytics()` is **never invoked** → Google Analytics is effectively OFF. **Decision recorded:** keep OFF; if ever enabled it must be consent-gated (and the s.9 children-tracking prohibition applies) — see §8.

### 3.2 Data flow map

```
Visitor / User browser (learnkinetika.com)
 ├─ Firebase Auth (email/password, verification, reset)                 [Google — global]
 ├─ Firestore (asia-south2, Delhi)                                      [Google — India]
 │    users/ enrollments/ progress/ quizAttempts/ quizSessions/
 │    + new under this plan: consents/ grievances/ erasureRequests/
 ├─ Cloud Storage (admin-uploaded course assets only)                   [Google]
 ├─ Cloud Functions (quiz logic: us-central1, US; onCourseDelete        [Google — cross-border]
 │    cascade: asia-south2)
 ├─ Edge middleware (verifies __session JWT via Google JWKS)            [Google — Edge]
 ├─ Genkit AI → Google Gemini API (AI tutor inputs)                     [Google — third party]
 ├─ YouTube iframes (video lessons)                                     [Google — third-party cookies]
 └─ UPI / PayPal QR (user pays off-platform; only the transaction
     reference string is stored — no card/bank data)
Hosting: Netlify (netlify.toml) or Firebase App Hosting — confirm at go-live.
```

### 3.3 Processor register (to be disclosed in the notice — Phase 1)

| Processor | Service | Data shared | Safeguard |
|---|---|---|---|
| Google LLC / Google Cloud | Firebase Auth, Firestore, Storage, Functions, Hosting, Cloud Logging | Account + learning data (incl. US processing for us-central1 Functions) | Google Cloud Data Processing Amendment auto-applies to Firebase — archive a copy in the compliance file |
| Google (Gemini API) | AI tutor | User-typed snippets (no account linkage) | Input caps + injection delimiters already in place; add PII guidance + notice disclosure |
| PayPal | Overseas payments | None directly (user pays off-platform; only reference string stored) | Disclose payer-side role |
| YouTube (Google) | Embedded video | Viewer metadata, cookies | Switch to `youtube-nocookie.com` (Phase 5) + disclose |
| Hosting provider (Netlify / Firebase App Hosting) | Web serving | Request metadata | Host's processor terms; confirm which host serves the domain at go-live |

### 3.4 What is already DPDP-favorable ✅

1. **Email verification enforced** before dashboard access (`handleSignIn` flow).
2. **Strong password policy** client-side (8+ chars, upper+lower, digit) — server-side enforcement added in Phase 4.
3. **Server-side admin authorization** — Edge middleware verifies ID token + `admin` claim, fail-closed (audit C3 resolved).
4. **Tight Firestore/Storage rules** — field-level write restrictions, size caps, deny-by-default (`firestore.rules`, `storage.rules`).
5. **India data residency** — Firestore in `asia-south2` (Delhi).
6. **No third-party trackers** — GA4 never initialized, no ad-tech, no marketing email.
7. **Data minimization** — only name + email + payment reference collected.
8. **Cascade deletion precedent** — `onCourseDelete` (`functions/src/index.ts`) is the exact BulkWriter template the user-erasure flow (Phase 3) needs.
9. **Storage holds no user files** — only admin course assets, so erasure sweeps are simple.
10. **AI inputs capped and delimited** (prompt-injection defense in `exam-prep-ai-assistant.ts`).
11. **Payment references visible to admins only** (`/admin/enrollments` behind middleware + rules).

---

## 4. Gap Register (G1–G16)

| # | Gap | DPDP basis | Severity | Closed by |
|---|---|---|---|---|
| G1 | Privacy policy is generic marketing text: not itemized, no version/date, cites a "contact form on our website" that does not exist, claims "marketing emails" that are never sent, no DPDP links (withdrawal / rights / Board complaint) | s.5, Rule 3 | 🔴 Critical | Phase 1 |
| G2 | Consent is bundled ("By signing up, you agree to ToS **and** Privacy Policy") — no standalone itemized notice, no explicit consent act, no consent record kept | s.6, Rule 3 | 🔴 Critical | Phase 2 |
| G3 | No consent-withdrawal mechanism; withdrawal must be as easy as giving | s.6 | 🔴 Critical | Phase 2+3 |
| G4 | **No account deletion anywhere.** No path deletes the Firebase Auth user, `users/`, `enrollments/` (payment refs), `progress/`, `quizAttempts/`, `quizSessions/`; no 48-hr pre-erasure notice | s.8(7), s.12, Rule 8 | 🔴 Critical | Phase 3 |
| G5 | No data export (access right: summary of data + processing activities + processor identities) | s.11 | 🟠 High | Phase 3 |
| G6 | Email hard-locked ("Email cannot be changed" on `/dashboard/profile`) — correction right not served | s.12 | 🟠 High | Phase 3 |
| G7 | No published Grievance Officer / redressal mechanism anywhere | s.13 | 🟠 High | Phase 1+3 |
| G8 | No nomination mechanism | s.14 | 🟡 Medium | Phase 3 |

| G9 | No age gate / children's-data declaration. The audience is adult fitness professionals (NSCA CSCS candidates), but the 18+ restriction must be *declared and enforced*; under-18s cannot be tracked or profiled | s.9, Rule 10 | 🟠 High | Phase 2+5 |
| G10 | Rule 6 security deltas: no server-side password policy (Identity Platform), no admin 2FA, no App Check, no 1-year log-retention/monitoring policy, API-key HTTP-referrer restrictions still pending (audit L1), **live service-account JSON in repo root** (`cscs-prep-2c063-firebase-adminsdk-*.json` — gitignored, but rotation + git-history verification required) | s.8(5), Rule 6 | 🟠 High | Phase 4 |
| G11 | No breach incident-response plan; no 72-hr Board report template; no user-notice template | s.8(6), Rule 7 | 🟠 High | Phase 6 |
| G12 | No retention schedule; payment references and learning records retained indefinitely; no erasure trigger when purpose lapses | s.8(7), Rule 8 | 🟠 High | Phase 0+3 |
| G13 | Cross-border processing (us-central1 Functions, Google global infra, PayPal) and the processor list are undisclosed; no archived processor agreements | s.8(2), Rule 15 | 🟡 Medium | Phase 0+1 |
| G14 | AI (Gemini) processing undisclosed; AI tool accepts anonymous input (abuse + unconsented third-party processing of anything the user types) | s.5, s.6 | 🟡 Medium | Phase 1+4 |
| G15 | No Consent Manager interoperability design (Rule 4 enters force 13 Nov 2026) | Rule 4 | 🟡 Medium | Phase 7 |
| G16 | Testimonials publish real names, locations, photos without a consent record | s.6 | 🟠 High | Phase 5 |

**Severity counts:** 🔴 Critical ×3 (G1–G4 subset) · 🟠 High ×7 (G5, G6, G7, G9, G10, G11, G12, G16) · 🟡 Medium ×4 (G8, G13, G14, G15).

---

## 5. Implementation Phases (step-level detail)

> Each phase: objective → numbered steps with exact file paths → acceptance criteria. Steps reference existing patterns in the codebase (`onCourseDelete` BulkWriter cascade, callable functions in `functions/src/`, field-restricted rules in `firestore.rules`).

### Phase 0 — Governance & decisions (Week 1)

**Objective:** establish accountability before any code changes.

1. **Confirm the Data Fiduciary legal entity** behind KINÉTIKA / Parmitrain (proprietorship/LLP/Pvt Ltd) — this is the entity the Board would penalize; it must be named in the notice.
2. **Appoint the Grievance Officer** ("such other person" under s.13): name, designation, contact. Create the mailbox `grievance@learnkinetika.com` (distinct from general support) and define the internal SLA: acknowledge in 72 hours, resolve in 15 days (well inside the statutory window — have counsel confirm the exact prescribed days against the Gazette text, G.S.R. 846(E)).
3. **Adopt the retention schedule** (Appendix A) — this drives Phase 3 engineering.
4. **Sign off the processor register** (§3.3); archive the Google Cloud Data Processing Amendment and hosting processor terms in a compliance folder (Drive/Box).
5. **Record the open decisions** (§8) — under-18 policy, payment-reference retention, email provider — with dates and owners.

**Acceptance:** Grievance Officer block drafted (Appendix D.1); retention schedule approved; decisions logged in this doc's §8 table.

### Phase 1 — DPDP-grade Notice & policies (Weeks 1–2)

**Objective:** close G1, G7 (publication half), G13, G14 (disclosure half).

**Step 1.1 — Rewrite `/privacy-policy` as a standalone itemized notice** (`src/app/privacy-policy/page.tsx`).

The rewritten page MUST contain, in clear and plain language, in this order:

1. **Who we are** — Data Fiduciary legal name, registered address/contact, "we operate learnkinetika.com".
2. **What data we collect (itemized table)** — exactly the rows of §3.1 items 1–10, each with its purpose(s). No vague "information such as" language.
3. **Why we process it (purpose per item)** — account management, course delivery, payment verification, progress/assessment, platform security, AI tool, legal compliance.
4. **Cookies & similar technologies** — `__session` (strictly necessary, described honestly: Firebase ID token for authentication/admin gating); YouTube embed data; statement that NO advertising/tracking cookies are used; Firebase Analytics is not enabled.
5. **AI features disclosure** — the AI tutor sends typed text to Google's Gemini API; guidance "do not enter personal data you don't intend to share with Google's AI service".
6. **Processors & cross-border transfer** — §3.3 register, plainly worded: data stored in India (Delhi) with some processing by Google in the US/global infrastructure; transfers made in compliance with s.8(2)/Rule 15 (no notified restrictions apply at the time of writing).
7. **Retention** — the schedule from Appendix A, in summary table form.
8. **Your rights** — access (s.11), correction/completion/updating (s.12), erasure (s.12), grievance (s.13), nomination (s.14), **withdrawal of consent with comparable ease** (s.6) — each with the in-product path ("Dashboard → Profile → …") and the grievance email.
9. **Grievance redressal block** — Grievance Officer name/designation/email; response window; **how to complain to the Data Protection Board** (link to the Board's digital office once public).
10. **Children's data** — the platform is intended for users 18+; we do not knowingly process children's data; under-18 signups are blocked; contact grievance if a child's data was provided.
11. **Withdrawal of consent / account deletion** — how it works, including the 48-hour pre-erasure notice.
12. **Security measures summary** — encryption in transit/at rest, access control, logging, backups (feeds from Phase 4 outcomes).
13. **Changes to this notice** — version number, effective date, change log; material changes trigger re-consent (Phase 2).
14. **Contact** — support (real, existing channels only: `support@kinetika.fit` per `src/lib/seo.ts`) and grievance mailboxes.

**Fix factual inaccuracies:** remove the "contact form on our website" claim (no such form exists) and the "unsubscribe from marketing emails" claim (no marketing email is sent).

**Step 1.2 — Update `/terms-of-service`** (`src/app/terms-of-service/page.tsx`): add "Eligibility: 18+", account-deletion terms, DPDP notice reference, governing-law alignment.

**Step 1.3 — Footer** (`src/components/sections/footer.tsx`): add "Grievance Officer" link (→ `/grievance` placeholder page in Phase 3, or `mailto:grievance@…` immediately) next to the existing Privacy/Terms links.

**Step 1.4 — Version the notice** — add `NOTICE_VERSION = "2026-09-XX.1"` + effective date + changelog at the top of the page and mirrored in `src/lib/consent.ts` (Phase 2) so consent records can pin the version.

**Step 1.5 — Sitemap/metadata** (`src/app/sitemap.ts`, `src/lib/seo.ts`): keep `/privacy-policy` entry; add `/grievance` when it ships.

**Acceptance criteria:**
- [ ] Notice contains all 14 sections; every data item in §3.1 has a stated purpose
- [ ] Links present: withdraw consent, exercise rights, Board complaint, Grievance Officer
- [ ] No factually false claims (no phantom contact form / marketing emails)
- [ ] Version number + effective date visible on the page
- [ ] Legal review sign-off (one fixed-scope engagement with counsel)

### Phase 2 — Consent engineering (Weeks 2–4)

**Objective:** close G2, G3 (capture half), G9 (attestation half).

**Step 2.1 — Consent library** — new `src/lib/consent.ts`:
- `NOTICE_VERSION` (mirrors Phase 1.4), `CONSENT_PURPOSES` enum: `account_management`, `course_delivery`, `payment_verification`, `progress_tracking`, `ai_tool`, `essential_security` (non-withdrawable, legitimate-operations basis).
- Type `ConsentRecord { uid; noticeVersion; purposes: ConsentPurpose[]; consentedAt: Timestamp; method: "signup" | "re-consent" | "renewal"; ip?: never }` — deliberately **no IP hash** (minimization; auth logs already cover abuse).
- Helper `hasCurrentConsent(record)` → checks version match + required purposes.

**Step 2.2 — Signup notice step** (`src/app/auth/page.tsx`):
- Before account creation, render a **standalone, scrollable itemized notice** (compact summary of the 14-section notice: data items → purposes, processors, rights links). NOT a checkbox buried under the submit button; NOT bundled with ToS acceptance.
- Two distinct affirmative actions: (a) "I have read the privacy notice and consent to the processing described" — this is the **consent act**; (b) separate "I accept the Terms of Service and confirm I am 18 or older" — contract + age attestation (s.9 posture).
- Block signup unless both are checked; keep them as two separate checkboxes (no pre-ticks).

**Step 2.3 — Consent record write (server-side)** — new callable in `functions/src/consent.ts` (Node 22, same toolchain as `quiz-attempts.ts`):
- `recordSignupConsent(uid, noticeVersion, purposes, attestedAge18)` → validates the Firebase ID token server-side, verifies the version matches the deployed `NOTICE_VERSION`, writes `consents/{uid}_{noticeVersion}`.
- Firestore schema (Appendix C.1): `{ uid, noticeVersion, purposes[], consentedAt, method, attestedAge18 }`.
- `firestore.rules` delta: `match /consents/{doc}` — **read**: owner only (`resource.data.uid == request.auth.uid`) or admin; **create**: `false` (server-only via Admin SDK); **update/delete**: `false` (immutable audit trail).

**Step 2.4 — Re-consent banner** — new `src/components/consent-banner.tsx`:
- On dashboard mount, client reads latest `consents/{uid}_*`; if `noticeVersion !== NOTICE_VERSION`, show a non-dismissible banner: "Our privacy notice has changed (v<new>). Review and consent to continue." with link to the notice + single consent button → calls `recordSignupConsent` with `method: "re-consent"`.
- Existing (grandfathered) users: Rule 3 requires them to receive the new notice too — the banner IS the grandfathering notice mechanism. Until they re-consent, keep access per current state but show the banner (decision recorded in §8.5).

**Step 2.5 — Withdrawal entry point** (ease-parity with giving):
- `/dashboard/profile` gains a "Privacy" card: **"Withdraw consent & delete my account"** → links into the Phase 3 erasure flow (withdrawal = deletion trigger; s.6(4)).
- Withdrawal of the `ai_tool` purpose alone: toggle in the AI tutor panel (`src/components/sections/ai-tutor.tsx`) — "Disable AI features for me" (stored locally + honored by hiding the tool; full erasure via deletion).

**Step 2.6 — Age attestation storage** — `attestedAge18: true` on the consent record + `users/{uid}.attestedAge18` (add to `createUserProfile` in `src/lib/course.ts` and the `UserProfile` type in `src/lib/types.ts`).

**Acceptance criteria:**
- [ ] No account can be created without the standalone notice + explicit consent act + 18+ attestation
- [ ] `consents/` doc exists for every new signup with correct version, purposes, timestamp; immutable by clients (rules-verified)
- [ ] Re-consent banner fires on version bump and records a new consent doc
- [ ] Withdrawal path is reachable in ≤3 clicks from any dashboard page
- [ ] Rules tests: client create/update/delete on `consents/` denied; owner read allowed

### Phase 3 — Data Principal Rights tooling (Weeks 3–6)

**Objective:** close G4, G5, G6, G8, G3 (withdrawal half), G7 (tooling half).

**Step 3.1 — Erasure request + cascade deletion** (closes G4, G3):
- New `functions/src/erasure.ts` with two callables (Node 22, Admin SDK):
  - `requestAccountErasure` — requires **recent authentication** (re-auth or fresh ID token, mirroring `quiz-attempts.ts` auth validation). Writes `erasureRequests/{uid}`: `{ uid, requestedAt, scheduledFor: +48h, status: "scheduled" }`. Sends the **48-hour pre-erasure notice email** (Rule 8) using the email provider chosen in §8.4; email template in Appendix D.3.
  - `confirmAccountErasure` — callable any time ≥48h after the request (or triggered by a scheduled Cloud Function): executes the cascade **reusing the `deleteAllDocs` BulkWriter pattern from `functions/src/index.ts`**:
    1. `users/{uid}`
    2. `enrollments` where `userId == uid` (this removes payment references)
    3. `progress` where `userId == uid`
    4. `quizAttempts` where `userId == uid`
    5. `quizSessions` where `userId == uid`
    6. `consents` where `uid == uid` — **except** the erasure audit marker
    7. `grievances` where `uid == uid` (retain the grievance record itself if unresolved — see Appendix A)
    8. `admin.auth().deleteUser(uid)` — the Auth record itself
    9. Write non-PII audit marker `erasureAudit/{hash(uid)}`: `{ hashedUid (SHA-256 + project salt), erasedAt, scope: "full-account", noticeVersion }` — retained 3 years as evidence of lawful erasure (Appendix A).
  - Firestore rules: `match /erasureRequests/{doc}` — read: owner; create: owner with strict field checks (mirroring the `enrollments` create rule pattern); update/delete: admin or false.
- `src/app/dashboard/profile/page.tsx`: "Delete my account" dialog (re-auth prompt → request → clear 48-hr notice explanation → confirmation state). Signed-out state after request; user can **cancel** during the 48-hr window (cancellation callable `cancelAccountErasure`).

**Step 3.2 — Data export (s.11 access)** (closes G5):
- `functions/src/export-data.ts`: callable `exportMyData` → aggregates `users`, `enrollments`, `progress`, `quizAttempts`, `quizSessions`, `consents` for the caller into a JSON document `{ exportedAt, noticeVersion, processingSummary, processorIdentities, data: {...} }` → uploads to a signed-URL Storage object (1-hour expiry) and returns the URL. Include the **processing summary + processor identities** (the register from §3.3) — the s.11 right covers these, not just raw data.
- `src/app/dashboard/profile/page.tsx`: "Download my data" button.

**Step 3.3 — Email correction (s.12)** (closes G6):
- `src/app/dashboard/profile/page.tsx`: replace the disabled email input with a "Change email" flow: new email → Firebase `verifyBeforeUpdateEmail(user, newEmail)` (requires recent login; sends verification to the NEW address) → on verified update, also `setDoc` `users/{uid}.email` (client path already exists for `displayName`).
- Fallback if Identity Platform tier blocks client email change: admin-assisted via the grievance channel (document in the profile UI copy).

**Step 3.4 — Nomination (s.14)** (closes G8):
- `users/{uid}` gains optional `nominee: { name, relation, contact }` (Appendix C.2); editable in `/dashboard/profile` ("Nominee (optional)") with plain-language explanation: "You may nominate a person who can exercise your data rights (access, correction, grievance) if you are unable to."
- Honoring path: nominee contacts the Grievance Officer; officer verifies identity + nomination record; requests executed manually (documented procedure — adequate for platform scale; no automated nominee login).

**Step 3.5 — Grievance mechanism (s.13)** (closes G7 tooling half):
- New `src/app/grievance/page.tsx`: published Grievance Officer block (Appendix D.1) + complaint form (name, email, category, description, optional related account email) → writes `grievances/{id}`: `{ id, name, email, category, description, status: "open" | "resolved" | "rejected", createdAt, resolvedAt, resolution }` (Appendix C.3).
- `firestore.rules`: `grievances` — create: **anyone** (unauthenticated allowed, request-only fields, size caps, `uid: null` allowed); read/update: admin only; complainant cannot read (privacy of other complainants) — status updates go by email.
- New `src/app/admin/grievances/page.tsx` (behind existing middleware): queue with status transitions; SLA fields `acknowledgedBy`, `acknowledgedAt` (72-hr target).
- Footer link (Phase 1.3) points here.

**Acceptance criteria:**
- [ ] Full-account erasure removes every doc set in §3.1 and the Auth user; verified by integration test with a test account
- [ ] 48-hr notice email received; cancellation inside the window works; post-window deletion irreversible
- [ ] Erasure audit marker exists (hashed uid only — no PII)
- [ ] Export JSON contains all user data + processing summary + processor identities; signed URL expires ≤1 hour
- [ ] Email change requires verification of the NEW address and syncs to `users/`
- [ ] Nominee saved/readable; grievance form works signed-out; admin queue transitions status

### Phase 4 — Security safeguards hardening — Rule 6 (Weeks 4–8)

**Objective:** close G10 (and G14's engineering half).

**Step 4.1 — Server-side password policy:** enable Firebase Identity Platform password policy (min 8 chars, requires upper+lower+digit — matching `validatePassword()` in `src/app/auth/page.tsx`), so enforcement is not client-only.

**Step 4.2 — Admin 2FA:** enroll admin accounts in TOTP second factor (Identity Platform); update `scripts/sync-admin-claims.mjs` README + admin onboarding doc; admin sign-in flow prompts second factor.

**Step 4.3 — App Check:** enable (reCAPTCHA Enterprise) for Functions, Firestore, Storage — this was already P3 in `docs/PRODUCTION_READINESS.md`; it also closes the anonymous-AI-abuse surface (audit H7's "deferred auth gate in favor of App Check").

**Step 4.4 — API-key restrictions:** apply HTTP-referrer restrictions to the web API key (`learnkinetika.com`, `www.learnkinetika.com`, localhost:9002 for dev) — pending audit item L1.

**Step 4.5 — Log retention & monitoring (Rule 6 "logs… monitored for 1 year"):**
- Create a Cloud Logging **sink** with 1-year retention bucket for: Firebase Auth events, Functions execution logs, middleware denials (Next.js server logs), Firestore/Storage rule denials (audit-logging enabled).
- Document a monthly review checklist (who, what to look for: rule-denial spikes, erasure ops, admin logins).

**Step 4.6 — Encryption & backups:** document that Firestore/Storage use Google-managed AES-256 at rest + TLS in transit (default); add **scheduled Firestore exports** (weekly to a separate bucket) + one documented restore test.

**Step 4.7 — Service-account key hygiene:** the live key `cscs-prep-2c063-firebase-adminsdk-*.json` sits in the repo root (gitignored, and `*.p12`/`*.key`/`*adminsdk*.json` patterns are covered in `.gitignore`):
1. Verify it was **never committed**: `git log --all --oneline -- '*adminsdk*'` (must be empty).
2. **Rotate** the key in Google Cloud IAM regardless (it has lived on disk).
3. Move the new key outside the workspace (e.g. `~/.secrets/`), referenced via `GOOGLE_APPLICATION_CREDENTIALS`.

**Step 4.8 — AI-tutor data hygiene (closes G14 engineering half):** in `src/components/sections/ai-tutor.tsx`: add inline guidance "Avoid sharing personal information — inputs are processed by Google's AI service" (disclosure lives in the notice, Phase 1.1 §5); keep App Check gate as the abuse control; keep input caps as-is.

**Acceptance criteria:**
- [ ] Password policy enforced server-side (weak signup rejected by Firebase, not just UI)
- [ ] Admin login requires 2FA; no admin account without it
- [ ] App Check enforced on Functions/Firestore/Storage (untrusted clients rejected)
- [ ] API key rejects off-domain referrers
- [ ] Log sink retains 1 year; review checklist exists and is calendared
- [ ] Weekly backups running; restore test documented
- [ ] Key rotated, moved out of repo, history clean

### Phase 5 — Third parties & children's data (Weeks 6–8)

**Objective:** close G16, G9 (final), and the operational half of G13/G14 (disclosure already covered in Phase 1).

**Step 5.1 — YouTube privacy-enhanced embeds:** change `getYouTubeEmbedUrl` in `src/lib/course.ts` to emit `https://www.youtube-nocookie.com/embed/<id>` (one-line change; keeps video delivery, drops ad-tracking cookies for embed viewers). Re-verify all rendering paths (`/courses/[slug]/learn`, homepage video section).

**Step 5.2 — Testimonials consent record (closes G16):** for each real person in `src/components/sections/testimonials.tsx` (Amarendra Singh, Tulika Singh, Abdullah, Salman):
1. Obtain written consent (Appendix D.4 form: name/photo/quote/location, purpose, channel, right to withdraw).
2. File signed records in the compliance folder.
3. If consent cannot be obtained → anonymize (first name + initial) or remove.
4. Maintenance rule going forward: no testimonial is published without a filed consent record.

**Step 5.3 — Children's data posture (closes G9 final):** record the §8.2 decision here + in the T&C (Phase 1.2): platform is 18+; signup is blocked without age attestation (Phase 2.2); no tracking/analytics/profiling exists that could reach children (GA off, no ad-tech — per §3.1). If under-18 users are ever to be accepted, a **verifiable parental consent** design (DigiLocker / registered Consent Manager) is a documented hard precondition before launch.

### Phase 6 — Breach readiness & records (Weeks 8–10)

**Objective:** close G11; produce the processing record.

**Step 6.1 — Incident-response runbook** (Appendix B → promoted to `docs/DPDP_INCIDENT_RESPONSE.md`): detect → contain → assess (what data, whose, how many, risk of harm) → **notify affected data principals without delay** (self-contained intimation: nature, extent, when, likely consequences, mitigation steps, contact) → **notify the Board without delay** + **detailed report within 72 hours** → remediate → postmortem. Assign named roles (who declares, who drafts notices, who sends).

**Step 6.2 — Templates:** pre-draft the Board report skeleton (Appendix B.2) and user-notice skeleton (Appendix B.3) so notification is fill-in-the-blanks under pressure.

**Step 6.3 — Processing records (RoPA-lite):** §3.1 + §3.3 + Appendix A constitute the record — promote to `docs/DPDP_PROCESSING_RECORDS.md`; schedule an **annual review** (calendar entry) and a **DPIA-lite checklist** to run before adding any new processing (analytics, payment gateway, email marketing, new processor).

**Step 6.4 — Retention enforcement:** promote Appendix A to `docs/DATA_RETENTION.md`. The Phase 3 erasure function enforces the "life of account" rows; a later ticket adds a scheduled monthly function that flags stale `erasureRequests` for execution and ages out expired exports.

### Phase 7 — Statutory tracking & future-proofing

| Milestone | Date | Action |
|---|---|---|
| Rule 4 — Consent Managers | **13 Nov 2026** | Design only: the `consents/` collection + callables already form the internal consent store — document how a registered Consent Manager could read/write consent status via an authenticated API. No immediate build for a small fiduciary; revisit when the Board publishes registration guidance. |
| Full Rules 3, 5–16, 22–23 | **13 May 2027** | Phases 1–6 live well before; re-run the §7 checklist in Q1 2027. |
| Board digital office | when public | Replace the placeholder Board-complaint link in the notice with the real URL. |
| Prescribed grievance window | when confirmed | Align `/grievance` SLA copy with the exact Gazette-prescribed days (counsel confirms against G.S.R. 846(E)). |
| Multilingual notices | if prescribed | The notice is data-driven (Phase 2.1); add Eighth-Schedule locale files if/when required. |

---

## 6. File-by-File Change Map

| # | File | Action | Phase | Purpose |
|---|---|---|---|---|
| 1 | `src/app/privacy-policy/page.tsx` | Rewrite | 1 | 14-section itemized notice + version/changelog |
| 2 | `src/app/terms-of-service/page.tsx` | Edit | 1 | 18+ eligibility, deletion terms |
| 3 | `src/components/sections/footer.tsx` | Edit | 1 | Grievance Officer link |
| 4 | `src/lib/seo.ts` | Edit | 1 | grievance email alongside support email |
| 5 | `src/app/sitemap.ts` | Edit | 1+3 | add `/grievance` |
| 6 | `src/lib/consent.ts` | **New** | 2 | notice version, purposes enum, consent helpers |
| 7 | `src/app/auth/page.tsx` | Edit | 2 | standalone notice step, consent act, 18+ attestation |
| 8 | `src/lib/course.ts` | Edit | 2 | `createUserProfile` writes `attestedAge18` |
| 9 | `src/lib/types.ts` | Edit | 2 | `UserProfile.attestedAge18`, `UserProfile.nominee` |
| 10 | `src/components/consent-banner.tsx` | **New** | 2 | re-consent banner |
| 11 | `src/app/dashboard/layout.tsx` | Edit | 2 | mount consent banner |
| 12 | `functions/src/consent.ts` | **New** | 2 | `recordSignupConsent` callable |
| 13 | `functions/src/index.ts` | Edit | 2+3 | export new callables |
| 14 | `firestore.rules` | Edit | 2+3 | `consents/`, `erasureRequests/`, `grievances/` rules |

| 15 | `functions/src/erasure.ts` | **New** | 3 | request/cancel/confirm erasure + cascade + audit marker |
| 16 | `functions/src/export-data.ts` | **New** | 3 | `exportMyData` callable + signed URL |
| 17 | `src/app/dashboard/profile/page.tsx` | Edit | 3 | delete-account dialog, data export, email change, nominee |
| 18 | `src/app/grievance/page.tsx` | **New** | 3 | public grievance form + officer block |
| 19 | `src/app/admin/grievances/page.tsx` | **New** | 3 | admin grievance queue |
| 20 | `src/lib/course.ts` (embed fn) | Edit | 5 | `youtube-nocookie.com` in `getYouTubeEmbedUrl` |
| 21 | `src/components/sections/testimonials.tsx` | Edit | 5 | consent record or anonymization |
| 22 | `src/components/sections/ai-tutor.tsx` | Edit | 2+4 | AI-purpose withdrawal toggle + PII guidance |
| 23 | Firebase console (Identity Platform, App Check, API keys, Logging sink, backups) | Config | 4 | no code file — runbook entries |
| 24 | `docs/DPDP_INCIDENT_RESPONSE.md` | **New** | 6 | runbook (Appendix B promoted) |
| 25 | `docs/DATA_RETENTION.md` | **New** | 6 | Appendix A promoted |
| 26 | `docs/DPDP_PROCESSING_RECORDS.md` | **New** | 6 | RoPA-lite (§3 + Appendix A) |
| 27 | `.gitignore` | Verify only | 4 | already covers `*adminsdk*.json` — no change expected |

---

## Appendix A — Data Retention Schedule

> Adopted in Phase 0; published in summary form in the notice; enforced by the Phase 3 erasure function. "Life of account" = until consent withdrawal / account deletion (with the 48-hr pre-erasure notice), plus the audit marker period.

| Data category | Retention period | Justification | Erasure trigger / owner |
|---|---|---|---|
| Account profile (`users/{uid}`: email, display name, role, attestation) | Life of account + immediate deletion | Service delivery (s.6(f) legitimate use for user-requested services) | Account deletion flow · Platform owner |
| Consent records (`consents/`) | Life of account + 3 years | Evidence of lawful consent (defense to Board complaint) | Scheduled cleanup post-erasure · Platform owner |
| Erasure audit markers (`erasureAudit/`) | 3 years from erasure | Proof of lawful erasure; no PII (hashed UID only) | Scheduled function · Platform owner |
| Enrollment records incl. **payment reference** | **8 years** after enrollment (⚠ confirm with CA — align with Income-tax book/record practice) OR account deletion, **whichever is later** | Payment-verification records; Indian financial record-keeping practice; fraud disputes | Scheduled function (age-out) + erasure cascade · Platform owner |
| Course progress (`progress/`) | Life of account | Service delivery | Erasure cascade |
| Quiz attempts / sessions | Life of account | Service delivery, admin analytics | Erasure cascade |
| Grievance records (`grievances/`) | 5 years from resolution | Grievance-handling evidence; pattern analysis | Scheduled function · Grievance Officer |
| Erasure requests (`erasureRequests/`) | Deleted with the account; marker retained per above | Process evidence | Erasure cascade |
| Export objects (Storage, signed URL) | Auto-delete ≤ 1 hour (signed-URL expiry) + daily cleanup job | Download window only | Signed URL expiry + scheduled cleanup |
| Infrastructure logs (Cloud Logging) | **1 year** (Rule 6 minimum) with monthly review | Security monitoring duty | Log sink retention · Platform owner |
| Firestore backups (weekly exports) | Rolling 4 weeks (4 generations) | Rule 6 backup duty; also bounds breach exposure in backups | Scheduled export rotation |
| AI tutor inputs | **Not persisted** by the platform; subject to Google Gemini API terms — disclosed in notice | Minimization | N/A |
| Backups containing erased users | Covered by 4-week backup rotation (documented residual risk, disclosed in runbook) | Restore capability | Backup rotation |

---

## Appendix B — Breach Notification Runbook (Rule 7 / s.8(6))

### B.1 Process

| Step | Action | Owner | Clock |
|---|---|---|---|
| 1 | **Detect & triage** — alert from log review, App Check, user report, or provider notice | Any → Incident Lead | Immediate |
| 2 | **Contain** — rotate keys/secrets, disable affected paths (rules deploy), revoke sessions | Incident Lead | Immediate |
| 3 | **Assess** — what data (map to §3.1), how many data principals, when, risk of harm | Incident Lead + Platform Owner | Without delay |
| 4 | **Notify affected users** — self-contained intimation (B.3) to each affected data principal | Platform Owner | **Without delay** |
| 5 | **Notify the Board** — initial intimation (B.2), then full report | Platform Owner (via Board digital office) | **Without delay**; detailed report **≤72 h** |
| 6 | **Remediate & postmortem** — root cause, Rule 6 fixes, update this doc | Platform Owner | ≤2 weeks |

### B.2 Board report skeleton (fill-in-the-blanks)

1. Nature, scope, and timing of the breach, including date/time of occurrence and discovery
2. Personal data types affected (map to §3.1 item numbers) and number of data principals affected
3. Likely consequences and risk of harm
4. Circumstances causing the breach (unauthorized access, misconfiguration, processor incident…)
5. Mitigation/corrective action taken and planned
6. Remedies for affected data principals and how they will be informed
7. Contact for follow-up (Grievance Officer)

### B.3 User-notice skeleton (self-contained — no external links required to understand it)

> Subject: Important security notice about your KINÉTIKA account
> We detected unauthorized [access/disclosure] of personal data on [date]. The data involved: [list — e.g., your name, email, course progress; payment references were/ were not involved]. What happened: [plain description]. What we have done: [containment + fixes]. What you should do: [password change, watch for phishing]. Questions: grievance@learnkinetika.com. You may also complain to the Data Protection Board of India.

---

## Appendix C — Firestore Schemas (new collections)

### C.1 `consents/{uid}_{noticeVersion}` (Phase 2 — server-written, immutable)

```ts
{
  uid: string;                 // Firebase Auth UID
  noticeVersion: string;       // e.g. "2026-09-21.1" — must match deployed NOTICE_VERSION
  purposes: ConsentPurpose[];  // subset of CONSENT_PURPOSES incl. essential_security
  consentedAt: Timestamp;      // serverTimestamp() at write
  method: "signup" | "re-consent" | "renewal";
  attestedAge18: boolean;      // must be true to proceed
}
```
Rules: read = owner or admin; create/update/delete = `false` (Admin SDK only).

### C.2 `users/{uid}` additions (Phase 2+3)

```ts
{
  // existing: uid, email, displayName, role, createdAt, updatedAt
  attestedAge18?: boolean;               // Phase 2
  nominee?: {                            // Phase 3 (s.14) — optional
    name: string;      // ≤ 100 chars
    relation: string;  // ≤ 100 chars
    contact: string;   // ≤ 200 chars (email or phone)
  };
}
```

### C.3 `grievances/{autoId}` (Phase 3 — public create, admin-only read)

```ts
{
  name: string;          // ≤ 100
  email: string;         // ≤ 200 — reply channel
  accountEmail?: string; // ≤ 200 — optional, if complaining about an account
  category: string;      // enum: access | correction | erasure | consent | grievance-officer | other
  description: string;   // 1..5000
  status: "open" | "acknowledged" | "resolved" | "rejected";
  createdAt: Timestamp;
  acknowledgedAt?: Timestamp;   // 72-hr internal SLA
  resolvedAt?: Timestamp;
  resolution?: string;   // ≤ 5000 — sent by email, not exposed to other users
}
```
Rules: create = anyone with strict field/size checks (`uid` never stored unless authenticated); read/update = admin only.

### C.4 `erasureRequests/{uid}` (Phase 3)

```ts
{
  uid: string;
  requestedAt: Timestamp;
  scheduledFor: Timestamp;   // requestedAt + 48h (Rule 8 pre-erasure notice)
  status: "scheduled" | "cancelled" | "executed";
  executedAt?: Timestamp;
}
```
Rules: read = owner; create = owner (strict fields, status must be "scheduled"); update = admin or cancellation path; delete = admin.

### C.5 `erasureAudit/{sha256(uid + salt)}` (Phase 3 — non-PII evidence)

```ts
{ hashedUid: string; erasedAt: Timestamp; scope: "full-account"; noticeVersion: string }
```
No rules needed (Admin SDK only). Retained 3 years.

---

## Appendix D — Copy Templates (ready to paste)

### D.1 Grievance Officer publication block (footer + `/privacy-policy` + `/grievance`)

> **Grievance Officer** — [Full Name], [Designation], KINÉTIKA ([legal entity name])
> Email: grievance@learnkinetika.com · Phone: [+91-XXXXXXXXXX]
> We acknowledge grievances within 72 hours and resolve them within [15] days. If you are unsatisfied, you may complain to the **Data Protection Board of India** [link to Board digital office when public].

### D.2 Re-consent banner copy (dashboard)

> **Our privacy notice has been updated (version {NEW}).**
> We've rewritten it in plain language: what we collect, why, for how long, and your rights — including account deletion. Review the notice and confirm to continue using your account. [Review the notice] [I've read it and consent]

### D.3 48-hour pre-erasure notice email (Rule 8)

> **Subject:** Your KINÉTIKA account deletion is scheduled
> You requested deletion of your account on {DATE}. As required by India's data-protection law, we are giving you 48 hours' notice before permanent erasure of your personal data (profile, enrollments and payment references, course progress, quiz records, and consent records).
> **Do nothing and your account will be permanently erased after {DATETIME}.**
> Changed your mind? Sign in and choose "Cancel deletion" before that time.

### D.4 Testimonial consent record (per person, signed and filed)

> I, [Name], consent to [legal entity] publishing my name, photograph, location (country), and testimonial text on learnkinetika.com and its marketing channels for as long as the platform operates, or until I withdraw this consent in writing to grievance@learnkinetika.com. I understand the publication is public and may appear in search results. — Signature/Email confirmation, Date.

### D.5 Signup notice-step microcopy (compact itemized summary)

> **What we collect & why** — Email (account + security emails) · Display name (personalization) · Payment reference you submit (verifying your enrollment) · Course progress & quiz results (delivering your course) · Anything you type into the AI tutor (sent to Google's AI service). **No ads, no trackers, no sale of data.** [Full notice] — you can withdraw consent and delete your account anytime from Profile → Privacy.

---

## 7. Verification & Go-Live Checklist

### Per-phase acceptance (summarized from §5)

- [ ] **P0:** entity + Grievance Officer recorded; retention schedule adopted; processors archived
- [ ] **P1:** notice has all 14 sections; no false claims; version visible; legal sign-off
- [ ] **P2:** consent act + record on every signup; re-consent banner works; rules deny client writes to `consents/`
- [ ] **P3:** erasure cascade deletes everything in §3.1 + Auth user (integration-tested); export includes processing summary; email change verified; nominee saves; grievance form works signed-out
- [ ] **P4:** server-side password policy; admin 2FA; App Check enforced; API key restricted; 1-yr log sink; backups + restore test; key rotated & moved
- [ ] **P5:** `youtube-nocookie` live; testimonial consents filed (or anonymized); 18+ posture recorded
- [ ] **P6:** runbook + templates promoted to `docs/`; RoPA published; review calendared

### Build validation (mirror `docs/PRODUCTION_READINESS.md`)

- [ ] `npm run build` green; `npx tsc --noEmit` clean
- [ ] `firebase deploy --only firestore:rules,functions` — new rules + callables deployed
- [ ] Emulator run: signup → consent recorded → export → erasure → auth user gone
- [ ] Existing flows unaffected: enroll → pay → approve → learn → quiz (regression pass)

### Compliance go-live

- [ ] Notice version pinned in `src/lib/consent.ts` matches the deployed page
- [ ] Grandfathered users see the re-consent banner
- [ ] Grievance mailbox live and monitored
- [ ] §8 decisions all resolved and recorded below

---

## 8. Open Decisions (owner: Platform Operator)

| # | Decision | Options | Recommended default | Status |
|---|---|---|---|---|
| 8.1 | Legal entity + Grievance Officer name for publication | — | Founder as officer; create `grievance@learnkinetika.com` | ⬜ Open |
| 8.2 | Under-18 policy | (a) hard 18+ gate *(attestation)* · (b) verifiable parental consent (DigiLocker/CM) | **(a)** — audience is adult professionals; (b) is a precondition if (a) is ever relaxed | ⬜ Open |
| 8.3 | Payment-reference retention | 8 years (tax practice) vs shorter | 8 years — confirm with CA | ⬜ Open |
| 8.4 | Email provider for rights/breach notices | Firebase Auth default templates vs transactional provider (Resend / SendGrid / Postmark) | Any provider that sends **from a domain you control** with deliverable templates; Phase 3.1 blocks on this | ⬜ Open |
| 8.5 | Grandfathered-user access during re-consent | (a) banner-only, access continues · (b) soft-block sensitive features until re-consent | **(a)** for launch simplicity — matches the Rules' own grandfathering-notice intent | ⬜ Open |
| 8.6 | Google Analytics | keep OFF / enable consent-gated later | **Keep OFF** — no current need; enabling requires a consent-first banner + s.9 check | ✅ Decided (keep off) |

---

## Sign-off

| Role | Name | Date | Notes |
|---|---|---|---|
| Platform Operator / Data Fiduciary | | | |
| Grievance Officer | | | |
| Legal review (notice text) | | | counsel — G.S.R. 846(E) verification of prescribed windows |

> **Maintenance:** review this plan annually and before any new processing (DPIA-lite, Phase 6.3). Update §2.2 milestones as the Board publishes registration/enforcement guidance.
>
> *End of plan — drafted 2026-09-07 from codebase @ `2bee668`.*



















