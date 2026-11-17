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
