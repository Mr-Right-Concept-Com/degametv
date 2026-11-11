# Viewer-to-Studio and virtual premiere build

## Goal
Make DeGameTV a connected virtual-premiere workspace while preserving its existing cinema, viewer accounts, Studio, live events, payouts, and admin data. Keep the viewer journey email-first and allow account creation to remain optional until a viewer chooses to sign in.

## Build scope
1. **Viewer entry and watch access**
   - Keep public film/event pages and guest checkout available without requiring signup.
   - Deliver a watch link to the purchase email and apply the creator-configured access window; signed-in viewers can also manage passes in their dashboard.
   - Never issue a paid ticket or report a refund without verified provider confirmation. Keep unavailable payment methods disabled and clearly explained.
2. **Creator and Business applications**
   - Add dashboard applications for Creator (identity/KYC, selfie/video, payout details) and Business (KYC plus KYB, selfie/video, business payout details).
   - Add automatic, manual, and hybrid administrator approval modes, applicant-visible status, and notifications where a configured email provider supports delivery.
   - Grant Studio access only after trusted approval; preserve the existing role table and secure review controls.
3. **Guided Studio publishing**
   - Extend the existing Studio into a context-aware “Create” flow for films, series, live streams, and upcoming events.
   - Use Zod validation and guided steps for industry metadata, rights, cast/crew, media links, pricing, territory, schedule, duration, access limits, and expiry.
   - Support drafts, review/approval where required, publishable share links and dedicated pages, and lifecycle transitions that preserve records.
4. **Unified administration and modular configuration**
   - Extend existing Godmode rather than create a second admin system: audited UUID-based management of applications, users/roles, studios, content, events, tickets, payouts, settings, and provider status.
   - Keep branding, payment/email/media provider selection, feature availability, and test/live controls data-driven; keep private credentials server-side and out of browser-readable rows.
5. **Security, deployment, and verification**
   - Inspect existing policies before schema changes; use migrations with explicit grants, restrictive RLS, and audit-safe server functions.
   - Enforce server-calculated prices, territory rules, ticket validity, expiry, and configured concurrency limits. Claim DRM, anti-capture, or CDN guarantees only when the selected provider confirms them.
   - Verify each available public and authenticated journey in the browser, run relevant tests, and report provider credentials, account verification, Supabase access, or session requirements that still block live E2E.

## Technical details
- Reuse the existing Supabase schema and routes where possible; add only necessary fields or tables and preserve existing records.
- Centralize provider-specific behavior behind adapters/configuration so providers can be switched without rewriting viewer or Studio flows.
- Treat email delivery, payments/refunds, private storage, and protected playback as unavailable until secure configuration and provider callbacks are verified.
- Keep the three existing surfaces distinct: public film/event pages, viewer dashboard, and the unified Studio/admin workspaces.
