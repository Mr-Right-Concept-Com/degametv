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



## 18 November implementation update

Completed prerequisites that the next build must reuse:
- Private identity evidence bucket `identity-documents`, owner-scoped upload/read policies, and server-side `submit-kyc` function.
- KYC React form now uploads private evidence and submits through the function.
- Playback authorization now deliberately fails closed without exposing the raw origin or consuming stream allowance.
- Duplicate `screening_tickets(screening_id)` index removed.
- `npm run typecheck` and a GitHub quality workflow added.
- Neon/PostgreSQL cost playbook added at `docs/operations/neon-postgres-cost-optimization.md`.

### Updated ranked build sequence

1. **Close identity authorization:** audit all profile mutation callsites; revoke broad profile UPDATE and grant an explicit safe-column allowlist; route verification/admin changes through role-checked server functions. Add KYC video proof, malware quarantine, review queue, immutable decision audit, evidence retention/deletion workflow and creator/business entitlement tests.
2. **Make CI executable:** reconcile npm lockfile, run typecheck/lint/build/axe, add real unit/integration/Edge Function tests, tenant isolation and RLS regression suite; require all checks on main.
3. **Payments:** implement provider-neutral payment intent/verify/refund/webhook ports, provider adapters, idempotency keys, immutable ledger, reconciliation and guest claim; external sandbox/production credentials required.
4. **Playback:** implement a provider/origin adapter that cryptographically verifies entitlement at the origin or through a controlled proxy; signed manifests, DRM where rights require it, session heartbeat, concurrency, expiry, geo and replay enforcement.
5. **Studio and rights lifecycle:** creator/business KYC, multi-user roles, rights/territory/time windows, upload quarantine/transcoding/QC, drafts/review/publish and expiry.
6. **Operations and engagement:** reminders, Fan Blast, gifts, loyalty, watch parties, reactions, check-in, live-to-replay and settlements.
7. **Platform ownership:** replace provider-specific app dependencies behind capability ports, instrument tenant/provider cost, restore drills, rollout/rollback, API/SDK/webhooks and admin governance.

### Acceptance additions

- KYC: a user can upload two files privately; another user cannot read them; the applicant cannot delete submitted evidence; staff reviewer can read only with approved role; decision creates an audit event; profile role cannot be self-elevated.
- Playback: provider-unconfigured request returns 503 without stream-count/session mutation or origin URL; configured origin rejects expired, forged, wrong-ticket and replayed entitlement tokens.
- CI: clean checkout plus locked install succeeds; typecheck, lint, build and axe finish green; no skipped security/E2E tests.
- Cost: duplicate index remains absent; query/egress/compute baselines are recorded; Neon is benchmarked only in isolated staging before any production decision.


### Newly completed identity security boundary
- Profile self-service updates are column-allowlisted; clients cannot insert/delete profiles or modify KYC status and identity fields.
- `review_kyc_application` is an authenticated-only SECURITY DEFINER RPC with fixed search_path, role check, row lock, atomic creator-role grant and audit log.
- Admin filmmaker review screen now obtains short-lived signed URLs for private identity evidence and invokes `review-kyc` with a required reason.

Next build must validate profile settings regression, test unauthorized and authorized reviewers, add reviewer step-up/MFA policy, add two-person approval for exceptional overrides, malware quarantine, evidence retention and data-subject deletion workflow.


## 18 November re-audit delta — completed safeguards and remaining work

### Completed and verified safeguards
- `audit_logs` INSERT revoked from anon/authenticated; service_role remains writer. Acceptance query: anon=false, authenticated=false, service_role=true.
- Atomic KYC submission RPC validates auth.uid, locks the profile row, verifies both evidence objects belong to the caller in the private identity bucket, checks MIME and 10 MiB size, rejects duplicate pending/verified applications, and records submission audit event.
- `submit-kyc` Edge Function validates a strict Zod request and calls the RPC with the caller JWT. Source committed and function deployed; signed-in browser journey still requires test.
- GitHub Actions quality workflow now exists at `.github/workflows/quality.yml` and runs npm ci, Chromium install, typecheck, lint, production build and axe audit. It is not yet evidenced as passing.

### Immediate next tasks
1. Reconcile `verify_jwt` deployment metadata for submit-kyc/review-kyc; retain explicit getUser() checks and do not assume the deployment response is authoritative if list metadata disagrees.
2. Execute the GitHub Actions workflow and fix actual failures without weakening gates.
3. Run authenticated KYC applicant and reviewer E2E, including cross-user object denial, invalid MIME/size, concurrent submission, unauthorized reviewer, approve/reject, audit and role grant exactly once.
4. Complete table-by-table grants/RLS tenant isolation tests; distinguish GraphQL discoverability warnings from actual row exposure.
5. Implement malware quarantine, video identity and business KYB only with approved providers and legal retention/consent decisions.
6. Payments remain blocked on merchant credentials and provider webhook secrets; playback remains blocked on origin-verifying delivery/DRM configuration. Continue all unrelated engineering while these are blocked.


### Additional KYC hardening and CI correction — 18 November 2026
- Database RPC explicitly rejects NULL identity type/MIME and object paths above 512 characters; verify direct RPC invocation tests as well as Edge validation.
- Supabase config and deployed metadata require JWT verification for submit-kyc and review-kyc. Preserve explicit getUser validation in handlers.
- Consolidate CI into a single workflow, use immutable `npm ci`, and do not auto-commit generated lockfile changes. First run must complete typecheck, lint, build and axe before quality bar status can be upgraded.
