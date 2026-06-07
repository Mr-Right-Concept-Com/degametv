# Surpass-Competitors Launch Plan

Goal: verify every existing Spixie-parity flow works end-to-end, fix what's broken, then ship 6 differentiators competitors don't have. All phases executed in parallel.

## Phase A — E2E Audit & Fixes (existing flows)

Walk every critical path in the live preview, log failures, fix in place.

1. **Buy ticket** — `/cinema` → screening → `/buy/:id` → 7-step funnel → `process-payment` → email with watch code. Verify Stripe/Paystack/Flutterwave/Bank all reachable, promo code applies, refund policy shows, geo check on submit.
2. **Watch** — `/watch/:code` → `validate-watch-code` → `get-playback-url` → HLS plays → 15s heartbeats hit `record-watch-heartbeat` → stream cap + concurrent-session enforcement → resume position works.
3. **My Tickets** — `/my-tickets` lists active/expired, resends email, shows remaining streams.
4. **Studio** — submit movie → admin approves → screening syncs to `/studio/screenings` → analytics page renders top-country chart with real heartbeat data.
5. **Admin** — `/admin/screenings` CRUD (geo, caps, refund policy), `/admin/tickets` search + CSV + one-click refund, `/admin/promo-codes`, `/admin/users`, gateways.
6. **AI Concierge** — widget answers movie/ticket questions, falls back gracefully.
7. **Reminders cron** — confirm 24h/1h emails fire idempotently.
8. **Subdomain routing** — `slug.host` resolves to `MovieLanding`.
9. **Auth** — signup/login/reset password, role assignment, RLS on every table.

Each broken item gets fixed in the same pass: missing GRANTs, dead navigate(), null-guard crashes, missing loading/empty states, mobile overflow.

## Phase B — Surpass-Competitor Features (new)

Spixie stops at tickets + streaming + basic analytics. We add:

1. **Live Watch Parties** — synchronized playback during premiere window. New table `watch_party_rooms` (host ticket, current_position, is_playing). Realtime channel broadcasts play/pause/seek to all ticket holders in the room. Sidebar chat using `screening_comments`.
2. **Live Reactions overlay** — floating emoji reactions on the player during premiere, broadcast via Supabase Realtime; aggregate counts shown to producer in analytics.
3. **Gift Tickets** — buyer enters recipient email; ticket emailed to them with personal note. New columns `gift_from`, `gift_message` on `screening_tickets`; flow added to BuyTicket step 1.
4. **Multi-currency auto-detect** — detect viewer country via `cf-ipcountry`, convert NGN base price using daily FX rates cached in `platform_settings`. Show local currency on `/buy` and `/cinema` cards.
5. **Loyalty Points** — `loyalty_points` table; earn on every ticket, redeem for % off via promo-code engine. Visible on `/dashboard`.
6. **Producer Forecasting** — `/studio/analytics` adds projected revenue (linear regression on hourly ticket velocity), drop-off heatmap (heartbeat positions binned into 10s buckets → bar chart), cohort retention (% returning for next premiere).
7. **Watermarked playback** — overlay viewer email + IP on the HLS player as a translucent moving label; deters screen recording.
8. **One-tap social share with auto-generated OG image** — edge function `generate-share-card` renders a poster + screening time PNG; viewer share buttons (X, WhatsApp, Telegram) link with that card.

## Phase C — Quality Hardening

- Real SEO titles via `usePageTitle` on every public page.
- Lighthouse audit: lazy-load images, preconnect fonts, defer non-critical JS.
- Mobile snap-scroll polish on `/cinema`, `/movie/:slug`.
- Empty states + skeleton loaders everywhere data fetches.
- 404 route + global error boundary.
- Run `supabase--linter`; fix all RLS/GRANT warnings.

## Files / migrations

| Action | Path |
|---|---|
| Migration | `<ts>_surpass_pack.sql` — watch_party_rooms, loyalty_points, gift columns, fx_rates JSON |
| Edge fn | `watch-party-sync`, `convert-currency`, `generate-share-card`, `award-loyalty-points` |
| New pages | `src/pages/WatchParty.tsx`, `src/pages/GiftTicket.tsx` |
| Edits | `BuyTicket.tsx` (gift + currency), `WatchMovie.tsx` (watermark + reactions + party), `VideoPlayer.tsx` (watermark overlay), `StudioAnalytics.tsx` (forecasting + drop-off + cohort), `UserDashboard.tsx` (loyalty), every public page (SEO) |
| Audit-fix | any file surfaced during Phase A |

## Execution

All three phases shipped in parallel: audit script + fix passes, new migration + edge functions, new pages + component edits, SEO sweep — one coordinated batch, then verify in browser preview before closing.

## Out of scope

True Widevine/FairPlay DRM (paid provider) and native mobile apps — kept on roadmap; watermarking + signed URLs cover 95% of the deterrent value.
