# DeGameTV roadmap

## Done
- [x] DB: ticket kind/access window, studio team, stream configs, fan blasts, promo banners, private KYB bucket, auto creator role on tier approval
- [x] Server-calculated ticket price (incl. replay price, add-ons, promo), admin-configurable commission/escrow
- [x] Guest checkout links ticket to a silently provisioned account
- [x] Replay viewing window counted from first play

## Open
- [x] Admin Godmode page (settings, roles, wallet adjust, tier force/revoke, lifecycle override, sign-in-as link, audit log)
- [x] Go Live studio (camera/mic/screen, lower-third, logo, WHIP browser push, RTMP/HLS settings, simulcast list)
- [x] Fan Blast page + sender
- [ ] Deploy admin-godmode and send-fan-blast — needs verification after backend reconnect
- [x] Studio team invites UI + private CAC document storage
- [ ] Fan Blast live sending — needs email provider credentials
- [ ] Real viewers need a stream provider account (any WHIP/RTMP)
- [x] Promo banners: admin/organizer manager + home/cinema display

## Oct 8 batch
- [x] Instant pass: after paying for a live/replay event the buyer goes straight to the player with a check-in message; bank-transfer tickets also linked to an account
- [x] Team & Promotion page (invite by email with Producer/Live Operator/Accountant/Viewer roles, seat limits), invited staff get Studio access
- [x] Company documents upload to private storage
- [x] Banner carousel on home and cinema; Godmode Banners tab; organizers can request placements
- [x] Clear error messages for Godmode, Fan Blast, refunds and resend email
- [x] Database update for team seats + banner approval
- [x] Deploy process-payment and process-refund safety changes

## Spixie parity and production verification
- [x] Audit current film intake, premiere, checkout, playback, refunds, reminders, reporting, and promotions
- [x] Add premiere date, cast/crew, rights territories, and prior-screenings intake fields; correct lifecycle-aware sale actions
- [x] Stop online and bank checkout from issuing fake successful tickets; explain missing payment setup
- [x] Stop admin refund flow from marking tickets refunded when no provider refund was sent
- [x] Restrict Studio invite/member helpers and trigger-only SECURITY DEFINER functions
- [x] Verify public cinema rendering and checkout failure state without false confirmation
- [ ] Run authenticated Studio/admin end-to-end paths — blocked: external Supabase auth session is unavailable
- [ ] Configure and test payment processing/refunds — blocked: no connected provider integration; stored gateway settings are test-only
- [ ] Verify real video delivery/reminders/Fan Blast — blocked: streaming provider and email sending credentials are not configured

## Production readiness follow-up
- [x] Audit connected database, routes, navigation, edge functions, and current provider settings
- [x] Remove public ticket creation and restrict the creator-role grant policy
- [ ] Replace payment credential exposure with secure server-side provider configuration and test/live gating
- [ ] Connect real Paystack, Flutterwave, and Stripe checkout/refund confirmation flows; never mark access paid before provider confirmation
- [ ] Wire remaining pages/navigation to live data; remove misleading mock-success states
- [ ] Deploy updated edge functions and verify public flows; complete authenticated end-to-end checks where a valid session is available
- [ ] Record any external provider, credential, or streaming/email setup still required

## Spixie parity closeout
- [x] Audit public film, checkout, playback, Studio, admin, email, and security paths; classify provider-blocked and mock paths
- [ ] Keep film intake, screening configuration, microsite routing, and landing-page metadata connected without replacing existing records
- [x] Remove mock booking success and legacy demo detail pages; route old event/content URLs to real cinema
- [x] Remove the public test-stream fallback and block playback until protected media delivery is configured
- [x] Stop payment settings from reading stored secret-key columns in the browser; disable key editing/live mode until secure setup exists
- [x] Fix the Studio analytics landing route
- [ ] Keep payment, refunds, email, streaming, reminders, geo-controls, payouts, and analytics truthful; only report confirmed provider outcomes
- [x] Verify public cinema, movie landing, checkout no-provider state, legacy redirects, and invalid-ticket denial in-browser
- [ ] Configure providers, verify deployed functions/migrations, and run authenticated E2E paths — blocked by missing provider setup and external Supabase auth session

## Consolidated production readiness
- [x] Prevent provider controls from appearing enabled when secure credentials and verified callbacks are unavailable
- [x] Require verified KYC before film submission; keep submitted content unpublished pending review
- [x] Disable public master-video and identity-document uploads until private storage and protected delivery are configured
- [x] Replace the Studio dashboard's fixed-zero earnings with ledger totals and separate NGN/USD analytics
- [ ] Restore Supabase project authorization before database changes, provider setup, or edge-function deployment
- [ ] Implement provider-managed Paystack, Flutterwave, and Stripe checkout/refunds, secure credential lifecycle, signed webhooks, and idempotent ticket settlement
- [ ] Configure private KYC/master-media storage and a real supported playback provider before enabling intake, sales, or playback
- [ ] Finish verified public/Studio/admin route checks and authenticated E2E after Supabase access and provider setup are restored
