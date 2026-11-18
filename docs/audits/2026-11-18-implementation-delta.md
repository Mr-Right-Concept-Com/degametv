# DeGameTV Implementation Delta — 18 November 2026

This file records the changes made after the 18 November re-audit. It supersedes earlier status statements only for the specific items listed below.

## Implemented on main

| Change | Commit | Evidence |
|---|---|---|
| Playback endpoint no longer returns origin URL or HMAC token until the media origin has a real verification adapter; it no longer increments stream count in the unavailable state | 5947c8e6882a2021b5334f6631b9a09033cc48a4 | SOURCE; deployed Supabase function version 10 ACTIVE |
| Private identity-documents bucket with 10 MiB limit and explicit MIME allowlist | cb36195ea5fc4921145cad170482776d74d7b942 | RUN: migration applied; SQL bucket query confirms private bucket |
| Owner-scoped upload/read policies for identity evidence; admin read access governed by role helper | cb36195ea5fc4921145cad170482776d74d7b942 | RUN: policy query confirms policies |
| Anonymous privileges removed from profiles; profile owner update policy now has ownership-preserving WITH CHECK | cb36195ea5fc4921145cad170482776d74d7b942 | RUN: has_table_privilege anon SELECT=false, UPDATE=false |
| Authenticated server-side submit-kyc Edge Function verifies caller, path ownership and file existence before setting pending status | 7d4fbe9ef4cf2a7a75226053046cd0f68a7e6af7 | SOURCE; deployed ACTIVE; no real user submission run |
| KYC form uploads to private storage and submits through Edge Function instead of direct profile mutation | d9b9461c34508790f4c78740d2cb567f54f4be0e | SOURCE; browser/device flow NOT TESTED |
| Submitted KYC evidence cannot be deleted by applicant; duplicate screening index removed | 9bff9e425601493bc7b2384cf2f3f9e598eba5a6 | RUN: migration applied; SQL confirms one index remains |
| Typecheck script and GitHub quality workflow added | d0def27695ef70b4a3768c7d275aa366e5ee8cfb / 9e7089b3b4d59691e870f5498997f081c00c690a | SOURCE; CI result NOT TESTED |
| Neon/PostgreSQL cost optimization playbook added | current documentation commit | SOURCE |

## Re-audit deltas

- Payment processing remains OPEN and returns 503. No provider keys were fabricated.
- KYC upload/submission code is now implemented, but end-to-end manual review, document scanning, admin review, video verification and entitlement enforcement remain NOT TESTED / PARTIAL.
- Playback is more strictly fail-closed. This is not playback completion; paid playback remains unavailable until an origin-verifying provider adapter is configured and tested.
- Anonymous profile table access is removed. Authenticated users still have table-level UPDATE on profiles. Privileged-column escalation therefore remains OPEN pending callsite inventory and a safe server-side profile mutation boundary.
- Supabase GraphQL exposure warnings remain; they require per-table classification and selective grants.
- Payment/refund provider integration remains blocked on credentials and an approved provider contract.
- GitHub CI statuses returned an empty status list at the time of this update. Do not interpret that as a pass.
- Lovable project latest_commit_sha was observed at 9e7089b3b4d59691e870f5498997f081c00c690a, matching GitHub main at that point.

## Outstanding external and execution gates

1. Run npm install/lockfile reconciliation and execute typecheck, lint, production build and browser accessibility workflow.
2. Run real signed-in upload and submit-kyc HTTP journey with a test account; verify cross-user object denial and admin review.
3. Integrate malware scanning/quarantine and approved identity evidence retention/deletion policy.
4. Implement profile column allowlisting without breaking existing profile settings or admin review.
5. Configure and test a payment provider sandbox; then implement signed webhooks, idempotency, reconciliation and refunds.
6. Configure a media provider/origin that validates short-lived entitlement tokens; prove direct-origin bypass is denied.
7. Run real Android, iOS, desktop and mobile-browser checks.
8. Complete selective GraphQL/table grant hardening after classifying public catalogue surfaces.


## Additional identity hardening and admin wiring

| Change | Commit / migration | Evidence |
|---|---|---|
| Revoke authenticated table-level profile UPDATE; grant only ordinary profile fields; verification columns cannot be updated by the authenticated role | f8b0a7139009e3bcd58d561194fc18d804b9c69a | RUN: auth table UPDATE=false; auth KYC status UPDATE=false; safe full_name UPDATE=true |
| Prevent authenticated profile INSERT/DELETE/TRUNCATE | 097811b1a4fc9e411aaca0e3afa1fde3f1fc60b1 | RUN: migration applied |
| Atomic SECURITY DEFINER review RPC checks caller role, locks pending application, writes decision + audit log, and grants creator role on approval in the same transaction | 0bf3547de308eb46f0b765b1233f49b48f54b73d + ef96e7084b9dbbd39baaba92026c2d206db02cce | RUN: anon EXECUTE=false; authenticated EXECUTE=true; SQL migration applied |
| Admin filmmaker application UI now uses short-lived signed URLs for private evidence and calls the audited review endpoint with a required reason | d3d6bd3398405e15aef2231635a417d27d6140c2 | SOURCE; browser workflow NOT TESTED |
| Review Edge Function redeployed using caller JWT and atomic RPC | 1dbfc9d159c7d949ea01f6b57a7ef59295e7f2e9 | RUN: deployment ACTIVE version 3 |

### Security result

The authenticated role can no longer set `kyc_status`, `kyc_verified_at`, identity document paths, or insert/delete profile rows directly. Safe profile fields remain editable. The approval transaction and creator-role grant are now one database transaction with an audit record.

Remaining: validate existing profile settings and admin user-edit workflows in a real browser; verify function CORS and auth on preview/production origins; run a real test applicant and reviewer account; add document malware quarantine and approved evidence retention.


## Final pass update — latest code commit c58c00547459d52bc7b6154106ecb7615ad25b9f

- Admin filmmaker review now creates 5-minute signed URLs from the private identity bucket; raw private object paths are never treated as public image URLs.
- Approval/rejection now calls `review-kyc`, requires a review reason, and no longer performs direct profile status mutation or a separate client-side creator-role insert.
- Corrected the conditional evidence preview JSX after static inspection.
- Lovable project sync was rechecked and now reports latest_commit_sha `c58c00547459d52bc7b6154106ecb7615ad25b9f`, matching GitHub main. Project status is ready.
- GitHub combined commit status remains an empty status list. CI has not been certified as passing.


## Re-audit correction and additional fixes — 18 November 2026

The following items were directly verified against the current main branch and connected Supabase project. These entries supersede conflicting earlier statements in this file:

| Finding | Change | Evidence |
|---|---|---|
| Client-forgeable audit records | Migration `20261118000800_restrict_client_audit_log_writes.sql` revokes INSERT on `audit_logs` from anon and authenticated; service_role remains able to insert | RUN: anon INSERT=false, authenticated INSERT=false, service_role INSERT=true |
| KYC submission race / weak server-side file checks | Migration `20261118000900_atomic_kyc_submission.sql` adds authenticated-only `submit_kyc_application`; it locks the profile row, verifies both Storage object owner IDs, bucket, MIME, size, and pending/verified state, then records an audit event in the same transaction | RUN: anon function EXECUTE=false; authenticated EXECUTE=true; function definition contains row lock and storage owner checks |
| KYC submission service-role mutation | `submit-kyc` now validates request with pinned Zod 3.25.76 and invokes the atomic RPC using the caller JWT | SOURCE; Edge deployment ACTIVE; real signed-in user flow NOT TESTED |
| KYC endpoint gateway JWT verification | `submit-kyc` and `review-kyc` redeployed with JWT verification requested; later function-list metadata did not consistently reflect the deploy response | OPEN: reconcile deployed `verify_jwt` metadata before claiming gateway-level JWT verification |
| Client-forgeable audit logs | No client role can insert; SECURITY DEFINER review/submission transactions and service_role retain server-side insertion | RUN: privilege checks above |
| Missing executable CI workflow | Added `.github/workflows/quality.yml` with locked npm install, Playwright Chromium install, typecheck, lint, build and axe accessibility audit | SOURCE: file committed; GitHub run NOT YET OBSERVED |

Latest commits in this pass:
- `6f9f6b1fb83e9cef2b151088a9d606cf6ff5642c` — audit-log write privilege restriction.
- `e70f4f20b7e45dbcd4e62afc945f75127db7a82c` — atomic KYC submission migration.
- `766de7b63d2cc5c30a78db0e7ac2bd7e535204df` — Zod-validated KYC Edge Function using caller-scoped RPC.
- `cb02d7283ee8aefd545fed3a6d7b99def22b809a` — executable GitHub quality workflow.

Supabase re-check at 2026-11-18 04:20 UTC: all 36 public tables have RLS enabled. Security advisor still reports 34 anon GraphQL schema visibility notices, 36 authenticated visibility notices, 9 authenticated SECURITY DEFINER functions, pg_net in public schema and leaked-password protection disabled. GraphQL schema visibility is not itself proof of row disclosure; every policy still requires an object/tenant audit. The new KYC submission RPC explains one additional SECURITY DEFINER finding and is authenticated-only with an explicit auth.uid check and fixed search_path.

No browser/device or full build test was executed in this pass. Payment and origin-verified playback remain unavailable. This audit delta is not a launch certification.
