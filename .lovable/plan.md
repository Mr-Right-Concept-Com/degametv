# Spixie Feature Parity Plan

Spixie.co markets six pillars: **Global Access, eTicketing, Streaming, Analytics, Security, Viewer Engagement**. DeGameTV already covers tickets, payment gateways, watch codes, promo codes, and an AI Concierge. The gaps below are what's missing for parity.

## Gap Analysis


| Pillar        | Spixie capability                                                                                              | DeGameTV today                                                                  | Action                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global Access | Worldwide reach + **geo-blocking** (allow/deny countries)                                                      | Location pricing only (NG vs Intl)                                              | Add `allowed_countries` / `blocked_countries` to `screenings`; enforce in `process-payment` + `validate-watch-code` via Cloudflare `cf-ipcountry` header                                  |
| eTicketing    | Global payments, **refunds**, **abuse prevention** (max streams, simultaneous streams, ticket validity window) | Stripe/Paystack/Flutterwave/Bank, 90-day expiry, no stream caps, no refund flow | Add `max_streams`, `max_concurrent_streams`, `stream_count`, `active_sessions` to `screening_tickets`; refund admin action + `process-refund` edge function                               |
| Streaming     | HLS + **adaptive bitrate**, high-throughput CDN                                                                | `VideoPlayer.tsx` is mostly a placeholder                                       | Wire hls.js with quality selector + ABR; signed playback URLs from edge function                                                                                                          |
| Analytics     | Viewer metrics (**top cities**, avg view time), revenue breakdown                                              | `analytics_events`, `watch_history` exist but no dashboard depth                | Add country/city + duration capture on heartbeat; new `/studio/analytics/:screeningId` page with top-cities chart, avg watch time, revenue split                                          |
| Security      | DRM, download/embed blocking                                                                                   | None                                                                            | Tokenized short-lived (5 min) signed playback URL per request; HLS key URL behind edge function; `Content-Disposition` headers + right-click/devtools deterrents; document DRM as roadmap |
| Engagement    | **Automated reminders**, promo codes, swag                                                                     | `screening_notifications` table only; promo codes wired                         | `send-screening-reminders` scheduled edge function (24h + 1h before premiere) using Resend; "Promotions" tab in Studio dashboard                                                          |


## Additional alignment items

- **Per-premiere subdomains** — Spixie uses `agabaidu.spixie.net`. Memory already notes subdomain routing; verify `MovieLanding` resolves a movie via subdomain host and add a sample mapping doc.
- **Producer landing/signup CTA** — surface a public `/producers` page mirroring Spixie's pitch (no contracts, no monthly billing, no minimums) that funnels to existing `/filmmaker` submission.
- **Refund policy per screening** — `screenings.refund_policy` text shown on `BuyTicket` step 1.

## Implementation Phases

### Phase 1 — Database (one migration)

- Add to `screenings`: `allowed_countries text[]`, `blocked_countries text[]`, `refund_policy text`, `max_streams_per_ticket int default 3`, `max_concurrent_streams int default 1`.
- Add to `screening_tickets`: `stream_count int default 0`, `active_session_token text`, `last_ip text`, `last_country text`, `refunded_at timestamptz`, `refund_reason text`.
- Add to `watch_history`: `country text`, `city text`, `watch_duration_seconds int`, `session_id text`.
- RLS + GRANTs preserved/added per project rules.

### Phase 2 — Edge functions

- `**process-refund**` — admin-only; reverses Stripe/Paystack/Flutterwave charge, marks ticket refunded.
- `**send-screening-reminders**` — cron (hourly) — sends 24h + 1h email reminders via Resend, idempotent on `screening_notifications`.
- `**get-playback-url**` — issues a 5-minute signed HLS URL, increments `stream_count`, rejects when caps exceeded or country blocked.
- `**validate-watch-code**` — extend to read `cf-ipcountry`, enforce geo + concurrency + stream cap, record country/ip.
- `**record-watch-heartbeat**` — accumulates `watch_duration_seconds` and city (from IP) into `watch_history`.

### Phase 3 — Frontend

- `**VideoPlayer.tsx**` — real `hls.js` integration with quality selector, ABR, heartbeat every 15s, anti-download attributes.
- `**/admin/screenings**` — add geo-restriction multi-select, stream caps, refund policy fields.
- `**/admin/tickets**` — refund button → `process-refund`.
- `**BuyTicket.tsx**` — show refund policy + promo code input (verify already wired) + country check before payment.
- `**/studio/analytics/[screeningId]**` new page — recharts bar of top cities, KPI cards (avg watch time, total minutes, completion rate, revenue), revenue split table.
- `**/producers**` new public landing page mirroring Spixie pitch → CTA to `/filmmaker`.
- `**MovieLanding**` — surface subdomain support (read `window.location.host` to auto-resolve slug).

### Phase 4 — Cron config

- Register `send-screening-reminders` in `supabase/config.toml` with hourly schedule.

## Files to add / modify


| Action        | Path                                                            |
| ------------- | --------------------------------------------------------------- |
| New migration | `supabase/migrations/<ts>_spixie_parity.sql`                    |
| New edge fn   | `supabase/functions/process-refund/index.ts`                    |
| New edge fn   | `supabase/functions/send-screening-reminders/index.ts`          |
| New edge fn   | `supabase/functions/get-playback-url/index.ts`                  |
| New edge fn   | `supabase/functions/record-watch-heartbeat/index.ts`            |
| Edit edge fn  | `supabase/functions/validate-watch-code/index.ts`               |
| Edit          | `supabase/config.toml`                                          |
| Edit          | `src/components/video/VideoPlayer.tsx`                          |
| Edit          | `src/pages/admin/Screenings.tsx`                                |
| Edit          | `src/pages/admin/ticketing/TicketManagement.tsx`                |
| Edit          | `src/pages/BuyTicket.tsx`                                       |
| Edit          | `src/pages/WatchMovie.tsx`                                      |
| Edit          | `src/pages/MovieLanding.tsx`                                    |
| New page      | `src/pages/studio/StudioAnalytics.tsx` (+ route + sidebar link) |
| New page      | `src/pages/Producers.tsx` (+ route + footer/nav link)           |
| Edit          | `src/App.tsx` (2 new routes)                                    |
| Dep           | `bun add hls.js`                                                |


##  build ui and ux 

- &nbsp;
  True studio-grade DRM (Widevine/FairPlay) — requires a paid DRM provider; we ship signed-URL + obfuscation now and flag DRM as roadmap.
- Cloudflare Workers for geo header — relies on Supabase Edge runtime headers; documented fallback to MaxMind if needed later. Fix all in parallel 