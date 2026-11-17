# Neon / PostgreSQL Cost Optimization Playbook

**Status:** architecture and operating policy; no Neon production migration authorized or performed.  
**Last reviewed:** 18 November 2026.

## Decision

DeGameTV currently runs on its connected Supabase Postgres project. Keep that database authoritative while the platform is stabilized. Do not migrate production data to Neon merely because scale-to-zero or autoscaling is attractive. First separate application contracts from the database provider, measure actual workload and compare total cost, latency, operational burden, recovery and security.

Neon is a candidate Postgres infrastructure adapter, not a domain dependency. Supabase remains the current deployment, auth, storage and Edge Functions provider. A Neon evaluation must not accidentally duplicate identity, storage or workflow ownership.

## Immediate cost work already executed

- Confirmed two identical btree indexes on `screening_tickets(screening_id)`.
- Removed `idx_tickets_screening_id`; retained `idx_screening_tickets_screening`.
- Verified after migration that exactly one of the two remains.
- No customer data was changed.
- No paid service was added.

## Operating playbook

### 1. Measure before resizing
Track per environment and tenant:
- database compute-hours / CU-hours and peak compute;
- storage GB-month and WAL/PITR retention;
- database, storage, auth, realtime and function egress;
- query count, p50/p95/p99 latency, rows scanned/returned;
- connection count, pool wait, idle-in-transaction sessions;
- cache hit rate and duplicate query volume;
- backup age, restore duration and restore verification.

Use `pg_stat_statements`, query plans and Supabase usage dashboards. Do not optimize by disabling backups, RLS, audit history or required retention.

### 2. Query and index discipline
- Select only required columns and bounded rows; paginate cursor-first.
- Avoid repeated client polling; use event-driven updates or bounded refresh.
- Cache public, slowly changing metadata with explicit TTL and invalidation.
- Add indexes only after EXPLAIN (ANALYZE, BUFFERS) demonstrates benefit.
- Remove only verified duplicate or unused indexes; record a reversible migration.
- Monitor index/table bloat and vacuum health; do not run expensive maintenance blindly in peak hours.
- Add tenant/time indexes to high-volume event tables only after query-plan evidence.

### 3. Supabase current-provider levers
- Keep production projects to the minimum required environments; delete abandoned preview projects only after data/backup ownership review.
- Reduce egress by selecting narrow projections, avoiding full-row mutation returns, and caching stable reads.
- Set storage lifecycle and retention for disposable transcodes and temporary uploads; preserve legal and identity evidence according to approved retention.
- Cap realtime subscriptions and fanout; prefer broadcast only where appropriate.
- Bound Edge Function timeouts, payloads and concurrency; do not retry non-idempotent actions.
- Review compute size against observed CPU, memory, IOPS and p95 latency before resizing.
- Keep Spend Cap / budget alerts and per-environment usage review enabled where available.

### 4. Neon candidate controls
For isolated development/test and bursty workloads, evaluate:
- scale-to-zero after the documented idle window (commonly 5 minutes);
- minimum and maximum autoscaling compute bounds;
- project-level usage quotas and spend notifications;
- branch cleanup and retention;
- pooled connections for serverless workloads;
- storage, network transfer, PITR/history and branch-delta charges;
- cold-start and first-query latency after suspension.

Neon's scale-to-zero documentation describes suspension after five minutes of inactivity and reactivation on demand; the first query may incur cold-start latency. Storage remains billable while compute is suspended. These properties make it attractive for non-production environments but do not automatically make it suitable for latency-sensitive ticketing or live-session state.

### 5. Migration gate
A Neon migration is approved only after:
1. A provider-neutral database contract and migration runner exist.
2. A production-like anonymized dataset is benchmarked on both providers.
3. RLS/auth semantics and service-role boundaries are proven equivalent.
4. PITR, backup export, restore, failover and rollback are rehearsed.
5. p95/p99 checkout, ticket lookup, playback authorization and Studio queries meet or beat current thresholds.
6. Total monthly cost includes compute, storage, egress, PITR, branches, observability, support, backups and engineering operations.
7. A two-provider failback/removal drill passes.
8. Security and data-protection reviewers approve the data residency and processor changes.

## Benchmark and cost formulas

- Cost per paid ticket = (database + storage + egress + functions + provider fees + fraud/refund loss + support allocation) / settled tickets.
- Cost per playback hour = delivery egress + transcoding + origin/DRM + storage allocation / successfully delivered playback hours.
- Cost per creator = creator-facing infra and support allocation / active earning creators.
- Contribution margin = net collected revenue - refunds/chargebacks - payment fees - creator share - variable delivery and verification costs.

Report actual values by tenant, title, country, provider and month. Until usage and finance records are connected, unit economics remain UNVERIFIED.

## Current findings / next actions

| Item | Status | Next action |
|---|---|---|
| Duplicate ticket index | FIXED | Keep one index; monitor plans |
| Query/egress budgets | OPEN | Capture 30-day baseline and top query report |
| Tenant cost attribution | MISSING | Add usage ledger with tenant/module/provider tags |
| Neon comparison | NOT TESTED | Benchmark isolated staging clone; no production cutover |
| Backup restore | NOT TESTED | Run isolated restore drill and record RTO/RPO |

## Public references

- Neon scale-to-zero: https://neon.com/docs/introduction/scale-to-zero
- Neon autoscaling: https://neon.com/docs/introduction/autoscaling
- Neon compute lifecycle: https://neon.com/docs/introduction/compute-lifecycle
- Supabase usage management: https://supabase.com/docs/guides/platform/manage-your-usage
- Supabase egress optimization: https://supabase.com/docs/guides/platform/manage-your-usage/egress
- PostgreSQL EXPLAIN: https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL ANALYZE: https://www.postgresql.org/docs/current/sql-analyze.html
