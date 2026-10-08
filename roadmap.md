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
- [ ] Deploy admin-godmode, send-fan-blast, process-refund — blocked: backend deploy failing with internal error
- [ ] Studio team invites UI + move CAC uploads to private bucket
- [ ] Fan Blast live sending — needs RESEND_API_KEY
- [ ] Real viewers need a stream provider account (any WHIP/RTMP)
- [ ] Promo banners: admin/organizer manager + home/cinema display

## Oct 8 batch
- [x] Instant pass: after paying for a live/replay event the buyer goes straight to the player with a check-in message; bank-transfer tickets also linked to an account
- [x] Team & Promotion page (invite by email with Producer/Live Operator/Accountant/Viewer roles, seat limits), invited staff get Studio access
- [x] Company documents upload to private storage
- [x] Banner carousel on home and cinema; Godmode Banners tab; organizers can request placements
- [x] Clear error messages for Godmode, Fan Blast, refunds and resend email
- [ ] Database update for team seats + banner approval — blocked: Supabase login expired
- [ ] Upload server functions (admin-godmode, send-fan-blast, process-refund, process-payment) — blocked: Supabase login expired
