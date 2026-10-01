# DeGameTV Premiere & Live-Event Infrastructure

Blocker: the connected Supabase project's authorization has expired. The database changes this plan needs can't be applied until Supabase is reconnected (Settings → Integrations → Supabase).

## Phase 1 — Dual-tier upgrade (Creator / Business)
- `/dashboard` "Upgrade to Studio" card that opens a tier picker.
- Creator: the existing KYC step (ID and selfie).
- Business: KYC plus KYB (CAC document, Tax ID, corporate bank, distribution-rights declaration, seat count).
- An automatic first check (file types, formats, duplicate IDs), then admin review in `/admin/filmmaker-applications` with tier badges.
- Upgrade from Creator to Business, and downgrade, from the Studio settings.

## Phase 2 — Event types and lifecycle
- Screenings get `event_type` (film | live) and `lifecycle` (upcoming | live | replay | archived), plus replay price and access window.
- `/movie/:slug` microsite shows a different screen at each stage: countdown, trailer and Notify Me while upcoming; buy-and-check-in, player, chat and watermark while live; on-demand purchase with a 24h/48h timer during replay; a re-run waitlist once archived.
- Organizer switch: "End live → Replay".

## Phase 3 — Streaming suite
- In-browser studio: webcam, mic, screen share and lower-third overlay, with a local preview.
- Pro RTMP: an ingest URL and private stream key for each event (key can be regenerated), plus simulcast destinations.
- Note: browser-to-viewer delivery needs a media provider such as Mux, Cloudflare Stream or LiveKit. The provider's API key is needed before it goes live.

## Phase 4 — Guest checkout and refunds
- Guest checkout with only an email (NGN/USD). A login-free "Enter Live Premiere" pass, linked to the account in the background.
- One-click cancellation of an event: every ticket is refunded and every buyer gets an email.

## Phase 5 — Wallet and payouts
- Commission on each sale: 10% for Creator, 7.5% for Business.
- Studio Wallet showing gross revenue, fees, escrow and withdrawable balance.
- Withdrawal requests that move through Pending → Approved → Paid, with an admin payout queue.

## Phase 6 — Fan Blast CRM and promotions
- Waitlist plus ticket-holder audiences. Email blasts sent from Studio before doors open or when the replay launches.
- Admin-managed panoramic hero banners and spotlight slots on the home page and cinema page.

## Technical details
- New tables: studio_accounts (tier, kyb fields), event_waitlist, stream_configs, wallet_ledger, withdrawal_requests, fan_blasts, promo_banners. Every new table gets GRANTs and RLS.
- Edge functions: verify-application, cancel-event-refund, request-withdrawal, send-fan-blast, rotate-stream-key, transition-lifecycle.
- Commission is calculated on the server inside process-payment and written to wallet_ledger.
- Every form is validated with Zod.

## Order
Phases 1, 2, 4 and 5 ship first, because they need only the database. Phases 3 and 6 follow, once a streaming provider is chosen.
