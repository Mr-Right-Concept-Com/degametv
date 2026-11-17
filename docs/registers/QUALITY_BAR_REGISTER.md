# DeGameTV Quality Bar Register
**Refreshed:** 2026-11-18 (UTC) · **Cadence:** monthly, plus trigger refresh on competitor launches, material accessibility/security changes, or benchmark regression. **Owner:** Product Engineering (named accountable individual not yet assigned).

## Non-negotiable release thresholds
- Functional: 100% of mandatory user journeys pass on production-like integrations; no disabled primary checkout, no simulated playback, no client-trusted entitlement.
- Security: every API has authn/authz, object + tenant checks, least privilege, immutable audit trail for staff actions, rate/velocity controls; secrets server-side only; no unresolved critical/high exploitable findings.
- Payments: signed webhook verification, idempotency, ledger reconciliation, refund path, duplicate/replay tests, provider failover or explicit single-provider risk acceptance.
- Playback: origin-verifiable authorization (DRM or equivalent secure delivery), entitlement and expiry enforced at origin, geoblocking/rights windows, no raw source leak.
- KYC: private evidence storage, least-privilege access, explicit consent/retention/deletion, server-side review state machine and immutable reviewer audit.
- Accessibility: WCAG 2.2 AA across key flows; keyboard, screen reader, contrast, focus visibility, target size, captions/audio description, reduced motion, localization and RTL.
- Reliability: SLOs defined and observed; payment/playback availability and failure rates measured; tested retry, idempotency, backup restore, incident response and rollback.
- UX: every failure state preserves progress and gives next action, support path and reference; no dead buttons, spinner-only screens or raw server errors.
- Performance: establish RUM baseline by device/network/market; Core Web Vitals target “good” thresholds at 75th percentile and mobile low-end baseline; record TTFV/task success.
- Release: build, typecheck, lint, unit, integration, contract, E2E, accessibility, security and migration checks required; no skipped tests or severity downgrades.
- Economics: contribution margin measured per title/event, user, transaction and provider; cost attribution by tenant/provider; fraud and refund losses measured.
- Admin: sensitive changes RBAC-gated, reasoned, audited, step-up protected; high-risk changes require two-person approval and reversible rollout.

## Current measured baseline
- Build/test/lint/E2E/visual/device: **NOT TESTED** in this pass.
- Payment success/failure/idempotency: **NOT TESTED**; checkout returns 503 by design.
- Protected playback origin enforcement: **NOT TESTED**; signing query alone is insufficient proof.
- KYC upload/review: **NOT TESTED**; upload handler is intentionally unavailable.
- Supabase security advisor (2026-11-18): 35 anon and 36 authenticated GraphQL exposure notices; one public-schema pg_net extension notice. These are findings to triage, not direct proof of unauthorized row access.
- Lovable/GitHub sync: SHA equality observed for 4297f5c2615a5b713d49dea7562e273eacd7d98f (RUN metadata).

## Metric ownership and gaps
Must-have advantage: trusted, rights-aware African independent cinema screening and monetization with creator-friendly distribution. **UNVERIFIED** until secure playback, successful checkout, verified payouts and rights controls are operational and measured.
Track: guest checkout conversion, time-to-first-play, playback start success, rebuffer ratio, payment success/decline, refund and chargeback rates, creator onboarding completion, median approval time, ticket redemption, creator net revenue, contribution margin, accessibility defects, support contacts and incident recovery time.
No numeric competitor superiority claims until comparable measurements and source methods are available.



## Measurement update — 18 November 2026

### New enforced / proposed gates
- TypeScript: `npm run typecheck` is now an explicit CI step.
- Production build and lint are explicit CI steps.
- Accessibility: axe-core Playwright route audit is wired into CI; execution is NOT TESTED until a GitHub Actions run reports green.
- Private identity uploads: 10 MiB maximum and MIME allowlist on the private identity bucket; server checks ownership and object existence before submission.
- Playback fail-closed invariant: missing origin-verification adapter must not return a media URL or consume ticket stream allowance.
- Database index hygiene: verified duplicate index removed.

### Current measured status
- Supabase SQL RUN: anon SELECT/UPDATE privileges on `public.profiles` are false after migration.
- Supabase SQL RUN: authenticated UPDATE on `public.profiles` remains true; privileged-column allowlisting is OPEN.
- Supabase SQL RUN: one canonical screening_id btree index remains on `screening_tickets`.
- Supabase SQL RUN: `identity-documents` bucket is private with a 10 MiB cap and image/PDF MIME allowlist.
- Edge deployment RUN: `get-playback-url` ACTIVE version 10; `submit-kyc` ACTIVE (manual caller authentication is implemented even though the deployed function metadata reports verify_jwt=false).
- CI status API returned an empty status list; therefore all build/test/accessibility thresholds remain NOT TESTED, not PASS.
- Browser/device visual QA, WCAG 2.2 AA full conformance, performance budgets and low-end device metrics remain NOT TESTED.

Thresholds are not lowered. A wired CI command is not evidence of a passing run.
