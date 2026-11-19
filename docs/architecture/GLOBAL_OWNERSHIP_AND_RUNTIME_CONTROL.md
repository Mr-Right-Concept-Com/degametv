# DeGameTV — Global ownership and runtime control architecture

Status: implementation programme; not a production certification.
Target: own or control at least 95% of the application-critical stack, with replaceable infrastructure adapters and tested exit paths.

## Architecture contract

- One product across responsive web, PWA, iOS, Android, macOS, Windows and Linux. Native shells consume the same authenticated APIs, event contracts, entitlement ledger and runtime configuration.
- Platform-owned contracts and data models are canonical. Vendors are adapters behind capability ports: payments, identity/KYC, bank verification, live ingest, VOD/transcoding, playback/CDN, object storage, email/SMS/push, analytics, FX, search, observability, fraud and AI.
- Provider registration, credentials, health checks, priorities, test/live mode, enable/disable, detach, rotation and rollout are controlled from a central Vault-backed registry. Runtime requests resolve the active binding; provider changes must not require frontend/native rebuilds.
- Never persist provider secrets in client-readable tables or return them to clients. Provider changes are authenticated, capability-authorized, validated, audited and reversible.
- Geographic adaptation is a preference, not an identity assertion: edge country signal first, browser locale as a hint, verified profile country where relevant, and explicit user override. IP geolocation alone must never decide KYC, sanctions, tax, payment eligibility or rights.
- Currency display is country-aware and user-overridable. Transaction currency is explicit and immutable on each order; conversion records rate/source/time and never silently changes an existing order.
- Admin control uses immutable UUID principals and role grants. God Mode is a super-admin capability with RBAC, step-up authentication for high-risk actions, audit reasons, safe release, rollback and two-person approval for destructive/high-risk changes. Never assume an administrator UUID.

## Ownership scorecard — evidence required

Do not publish a percentage until each domain has an inventory, code/data ownership proof, dependency map, export path, restore drill and provider swap drill. Score by criticality-weighted evidence, not source-file count.

| Domain | Target | Current gap |
|---|---:|---|
| Product source, UX, API contracts, domain model | 100% | Repository owned; API/SDK contract coverage incomplete |
| Identity, roles, sessions, KYC workflow | 95%+ | Managed auth/storage and external verification dependencies remain |
| Database, event bus, queues, workflow runtime | 95%+ | Managed Postgres/Edge authoritative; independent restore/runtime not proven |
| Media ingest, transcode, storage, CDN, playback | 95%+ | No active live provider; origin/CDN exit drill not proven |
| Payments, ledger, payouts, tax | 95%+ | No active production payment provider; external rails remain adapters |
| FX, locale, country policy | 95%+ | 22 starter country rules; Vault-managed FX capability and runtime checkout display are wired; no FX binding/rates verified and global coverage remains incomplete |
| Messaging, email, push | 95%+ | Registry exists; end-to-end portability unproven |
| Observability, security, release and support | 95%+ | CI/audit foundations exist; restore/rollback/SLO proof remains |

## Implemented runtime control-plane increment (2026-11-19)\n\n- `country_currency_rules` provides 22 starter country/currency/locale rules; user profile preference columns are present.\n- `runtime-config` is deployed and consumed through the app-wide `RuntimeConfigProvider`; country detection uses edge country when present and locale hints as fallback.\n- `convert-currency` resolves an enabled `fx_rates` binding and its mode-specific Vault credential at request time; no environment-variable provider key is used. The provider contract expects a normalized `{ rates: { ISO: number } }` response.\n- God Mode has a Global & releases panel for country rules and feature controls. Eight baseline module flags are seeded; the runtime endpoint evaluates canary cohorts deterministically from a stable authenticated-user or anonymous-visitor identifier and refreshes active clients every 30 seconds.\n- Feature gates are wired to Creator live, screenings, analytics, team, fan messaging, cinema ticketing and playback routes; backend checks protect live provisioning, live/VOD checkout and live/replay playback authorization.\n- FX capability is registered in the central provider binding table and provider administration UI. No FX provider is currently configured, so conversion correctly fails closed instead of inventing rates.\n\n## Safe release lifecycle

Allowed states: draft, canary, released, paused, rolled_back. A 100% release is only allowed in released; canary percentage is explicit. Every mutation carries actor UUID, timestamp, reason and before/after audit record. Runtime consumers must fail closed for security/entitlement features and fail gracefully for non-critical presentation features.

## Remaining Creator OS acceptance areas

1. Global onboarding, creator identity/KYB, rights declarations, territory windows and localization.
2. Production ingest, resumable uploads, malware quarantine, transcoding, captions/subtitles, poster/artwork validation and asset provenance.
3. Film, series, episode, short, trailer, music video, podcast, gaming, sports, educational, VOD and live metadata schemas.
4. Draft/review/approval/publish/schedule/unpublish/withdraw lifecycle with audit history and tenant/creator isolation.
5. Studio teams, role scopes, invitations, approvals, finance separation, statements, revenue shares, taxes and payout reconciliation.
6. Screening/premiere, free/ticketed admission, checkout, ticket claim, playback authorization, replay windows, refunds and chargebacks.
7. OBS/vMix ingest, stream health, reconnect grace, recording, replay readiness, failover and provider webhook replay.
8. Creator analytics, audience CRM, consented fan messaging, exportable reports and moderation.
9. One Creator OS experience across web/PWA/native shells, with shared deep links, push events and realtime state.
10. Contract tests, negative authorization tests, browser/device E2E, load/failure drills, accessibility and restore/rollback certification.

## Release gates

No production-ready claim until web and native builds pass, database and edge contract tests pass, provider sandbox and production paths are exercised, OBS/vMix ingest and playback/replay are proven, payment/refund reconciliation passes, KYC review and evidence retention pass, admin safe-release/rollback passes, and backup restore/provider exit drills are recorded.