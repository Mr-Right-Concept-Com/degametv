# DeGameTV Ownership & Capability Status
**Updated:** 2026-11-18

## Ownership register
| Layer | Current ownership | Exit / portability requirement | Status |
|---|---|---|---|
| Web UI | React, Vite, TypeScript, project source | source owned; portable static hosting | PARTIAL (repo verified; build not run) |
| Database/auth/storage | Supabase managed Postgres/Auth/Storage/Edge Functions | documented schema export, storage export, auth migration and restore drills | PARTIAL; vendor coupling exists in integration layer |
| Payments | No active provider verified | payment port, provider adapters, portable ledger and webhook replay | MISSING |
| Media delivery | HLS.js client; provider origin not certified | provider-neutral media port, origin token/DRM and content export | PARTIAL |
| Email | Supabase Edge Function / external provider config | provider-neutral messaging adapter and suppression export | PARTIAL |
| Analytics | Supabase tables and client aggregation | event schema, export and warehouse portability | PARTIAL |
| KYC | UI present, upload unavailable | portable evidence export, retention/deletion, provider adapter | MISSING |

Ownership percentage: **UNVERIFIED**. A defensible percentage requires inventory of production code, data, credentials, runtime, critical providers, licenses, operational runbooks and tested exit paths; do not invent a score.

## Capability exposure
| Capability | UI | API/service | Data | RBAC/admin | Cross-platform/API SDK | Evidence |
|---|---|---|---|---|---|---|
| Viewer/cinema | present | Supabase queries | content/screenings | partial | NOT TESTED | STATIC |
| Guest checkout/payments | present | process-payment returns 503 | ticket/payment foundations | admin gateway screen | no public SDK evidence | STATIC |
| Protected playback | present | validation + URL functions | ticket/watch history | partial | NOT TESTED | STATIC + deployment RUN |
| Creator KYC | present | upload handler no-op | profile fields | admin review partial | NOT TESTED | STATIC |
| Studio teams | present | direct table calls | studio_members | policy exists, role matrix untested | NOT TESTED | STATIC |
| Fan Blast | present | send-fan-blast function | fan_blasts | consent/risk unverified | NOT TESTED | STATIC |
| Analytics | present | direct table reads | ticket/watch_history | tenant scoping unproven | NOT TESTED | STATIC |
| Admin/God Mode | broad pages | admin-godmode function | multiple tables | full step-up/audit/two-person approval unverified | NOT TESTED | STATIC |

No capability is certified L2/L3 based on this audit. Product baseline maturity remains L1 foundations.



## Implementation delta — 18 November 2026

- Identity evidence now has a private Supabase Storage bucket and owner-scoped object policies. Supabase Storage remains an external provider dependency; the application must consume it through a storage port before claiming provider independence.
- KYC form and server-side submission function are implemented, but malware quarantine, reviewer workflow, video verification, data retention and end-to-end entitlement proof remain PARTIAL / NOT TESTED.
- Playback capability is intentionally fail-closed. No provider/origin adapter has been absorbed yet; do not count signed query tokens as secure delivery.
- Payment capability remains unavailable (HTTP 503). No payment provider is configured or certified.
- GitHub workflow now defines typecheck, lint, build and axe checks; execution result remains NOT TESTED.
- Duplicate screening ticket index removed; one canonical index remains.
- Anonymous SELECT/UPDATE access to profiles revoked and owner UPDATE policy now preserves user_id. Authenticated table-level UPDATE remains a high-priority unresolved ownership/security boundary.
- Neon is an evaluated database option only; no production data or infrastructure has been moved. Supabase remains authoritative until provider swap and restore drills pass.


### Identity privilege boundary — 18 November 2026
- Authenticated table-level UPDATE on profiles is revoked; only full_name, display_name, avatar_url, bio, country, timezone and language are granted as updateable columns.
- Authenticated INSERT/DELETE/TRUNCATE on profiles is revoked; profile creation remains auth-trigger managed.
- Verification state is changed only by the server-side submit/review paths. The atomic review RPC checks admin role, locks the pending row, grants creator role on approval, and writes an audit record.
- Supabase Storage remains provider-owned infrastructure. The identity storage interface must be extracted behind a storage capability port before claiming native/provider-independent ownership.


## Re-audit correction — 18 November 2026

- KYC submission is no longer a service-role profile mutation path: authenticated caller invokes a single RPC that verifies Storage ownership/MIME/size and serializes status transition with a row lock. Evidence remains in Supabase Storage, so portability is still PARTIAL.
- Audit logs are now write-protected from anon/authenticated clients; server-side service role and the protected SECURITY DEFINER transaction remain writers.
- All 36 public tables were confirmed RLS-enabled by SQL RUN. This does not establish policy correctness or tenant isolation; those remain unproven.
- CI ownership: GitHub Actions workflow now defines the web quality pipeline; no successful run has yet been observed.
- Supabase remains current managed database, auth, object storage and Edge runtime. Neon remains an unimplemented evaluation candidate; native infrastructure ownership is not claimed.
