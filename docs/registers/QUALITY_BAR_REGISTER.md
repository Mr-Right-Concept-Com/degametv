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
