# DeGameTV Next Build Brief — 2026-11-18
Priority ordered by user harm and dependency. No feature should be started atop an unproven foundation.

## 0. Establish executable CI and runtime evidence
**Why:** Current package manifest exposes build, lint and accessibility scripts only; no full test/typecheck/E2E command set was verified.
**Build:** deterministic dependency install, typecheck, lint, unit/integration/contract/E2E scripts, CI workflow with artifacts and failure retention.
**Acceptance:** clean install; build/typecheck/lint and all suites pass; no skipped tests; migration checks and a11y scan run in CI.
**Benchmark:** 100% required checks green; no blocker/major/minor.
**Reuse:** existing Vite, TypeScript, Vitest/Playwright if already installed, axe-core and Supabase test harness.

## 1. Secure identity, KYC/KYB and creator approval
**Build:** private evidence bucket; owner-scoped upload path; MIME/size and malware checks; server-side application submission; status state machine; staff review RBAC, reason codes, audit; verified status and creator entitlement assigned only by trusted service. Business KYB, selfie and video checks configurable by approved provider.
**Acceptance:** applicant cannot set verified/role/tenant/payout fields; other tenant cannot read evidence; signed review access expires; reject/resubmit and delete/retention flows tested; admin audit immutable.
**Benchmark:** complete application flow and 0 unauthorized evidence access in security suite.
**Dependencies:** legal basis, consent/retention decision, KYC provider credentials where automated checks required.
**Reuse:** Supabase Storage private bucket, existing auth/RBAC, audit log, notifications, provider vault and risk engine.

## 2. Payments, tickets, guest checkout and settlement
**Build:** provider-neutral payment port; Paystack/Flutterwave primary options for Nigeria subject to account availability, Stripe where supported; server calculates price from canonical screening, promo and currency; signed webhook; idempotent order/payment/ledger; guest email watch link; claim purchase; refund; reconciliation and creator settlement.
**Acceptance:** real sandbox transaction, webhook signature tamper/replay tests, duplicate idempotency, guest claim, expiry, refund, settlement ledger all pass.
**Benchmark:** no duplicate charges/tickets, 100% ledger reconciliation for test batch; payment success and failure reason metrics.
**Dependencies:** real provider sandbox/live keys, webhook secrets, merchant onboarding, tax/legal policy.
**Reuse:** existing process-payment/process-refund, ticket tables, ledger, vault, risk and messaging.
**Hard stop:** no provider secrets may be invented.

## 3. Origin-verified playback and rights enforcement
**Build:** media delivery port with provider-signed token or DRM; authorization bound to ticket/user/session/device; rights territories, date windows, concurrency and expiry checked at origin; playback proxy only if required and capacity-cost reviewed.
**Acceptance:** expired/forged/replayed token denied by origin; no raw source URL; geo and window restrictions; cross-device concurrency; live-to-replay entitlement; captions/audio description.
**Benchmark:** measure startup, rebuffer ratio, failure rate and bitrate on low-end Android/slow network.
**Dependencies:** streaming/DRM provider and origin configuration.
**Reuse:** validate-watch-code, get-playback-url, ticket entitlement, rights metadata.

## 4. Tenant-safe studio and event lifecycle
**Build:** one event aggregate and workflow from draft/review/publish/schedule/live/replay/expired; strict creator/business tenant scope; teams and Producer/Live Operator/Accountant/Viewer permissions; creator analytics.
**Acceptance:** role matrix tests, cross-tenant negative tests, persistence across sessions, publish/expiry and audit.
**Benchmark:** all Studio roles complete their allowed workflows; zero unauthorized mutations.
**Reuse:** content, screenings, studio_accounts, studio_members, existing Studio/Admin surfaces.

## 5. Audience relationship and engagement
**Build:** consent-aware audience service shared by Fan Blast, reminders, watch parties, reactions, gift tickets, loyalty and promotional placements; rate/velocity limits, unsubscribe/suppression, abuse review, campaign delivery receipts.
**Acceptance:** opt-out honored globally, no unauthorized event audience, idempotent gift issuance, watch-party host/member permissions and audit.
**Benchmark:** delivery success, opt-out propagation latency, abuse rate and cost per delivered message.
**Reuse:** send-fan-blast, reminders, event_waitlist, tickets, notifications, risk engine.

## 6. Registers, API and platform control plane
**Build:** database-backed capability/config registry, signed remote config, API/SDK/webhooks/events, generated contracts, manifest/permissions, admin CRUD with audit/step-up/two-person approval, versioned competitor and quality registers.
**Acceptance:** schema validation, config signature rejection, canary/revert, API contract diff, webhook replay, provider removal drill.
**Benchmark:** every capability has a discoverable contract and admin ownership; no orphan module.
**Reuse:** existing Supabase control plane, platform settings, feature flags, admin routes and shared adapters.

## 7. Category differentiation and economics
**Build:** rights-aware African catalog, territory/date/license type avails, localized pricing/checkout, creator statement and settlement transparency, audience analytics and distribution partner API.
**Acceptance:** rights validation prevents unavailable territory/window sales; test royalty statement reconciles to ledger.
**Benchmark:** contribution margin per event/title and creator net revenue; compare only after equivalent measurements.
**Reuse:** content metadata, allowed/blocked countries, revenue_splits, wallet ledger, convert-currency.

## Human handoff / sign-offs
Payment and streaming provider credentials; KYC provider/legal basis and retention; legal review for rights, royalties, tax, refunds and content moderation; security review of identity and payment paths; fraud policy approval; real iOS/Android/desktop/browser testing.
