# Spixie parity closeout

## Goal
Bring DeGameTV's public filmmaker-to-viewer journeys as close as possible to the requested Spixie feature set while preserving existing records, roles, tenant isolation, and admin/Studio functionality. Never report a provider-dependent capability as working before it is configured and verified.

## Work
1. **Remove misleading routes and confirmations**
   - Replace the mock `/cinema/:id` booking page and mock `/content/:id` detail page with database-backed routes or safe redirects into the canonical `/movie/:slug → /buy/:slug → /watch/:watchCode` flow.
   - Ensure checkout displays only genuinely configured payment methods and cannot claim success without server-confirmed settlement.
2. **Secure playback before enabling sales**
   - Route all playback through validated entitlement/session issuance; remove the public test-stream fallback and raw-media-URL path.
   - Enforce paid/refunded/expired status, first-play access windows, geo limits, event lifecycle, and stream/concurrency limits. If the configured media origin cannot enforce signed access, clearly block playback rather than calling it protected.
3. **Complete the filmmaker-to-premiere handoff**
   - Preserve submission rights territories, prior screenings, premiere date, synopsis, poster/trailer, and cast/crew through review, ownership, screening setup, and the public page.
   - Keep approval and publication under authorized admin control.
4. **Make related customer and operator flows truthful**
   - Keep email, reminders, Fan Blast, refunds, and payouts visibly pending/unavailable unless provider confirmation exists; do not report mock sends or manual status changes as completed external transactions.
   - Correct analytics for currency separation and unique-viewer semantics; repair route and navigation mismatches.
5. **Use secure provider configuration**
   - Keep all private payment/email/media credentials server-side; remove secret values from browser reads and admin forms.
   - Connect and test the providers supported by the current external-Supabase setup, using verified callbacks, idempotent settlement, refunds, and audit trails. If the needed secure setup is unavailable, leave the operation disabled and document exactly what is needed.
6. **Verify and report**
   - Test public film pages, checkout failure/success boundaries, ticket entitlements, playback denial, support routes, Studio/admin navigation, and provider-independent workflows in a browser.
   - Run the project's relevant tests and inspect build/runtime signals; record external-credentials and authenticated-session blockers separately.

## Technical decisions
- Keep payment settlement and ticket issuance server-authoritative; never trust browser prices or redirect returns.
- Preserve external Supabase and existing tables/data; use migrations only for required schema changes, with grants and restrictive RLS.
- Do not store private provider keys in database rows readable by the browser. Do not enable real-money checkout until keys and webhook verification are safely configured.
- Avoid broad schema or route replacement; retain existing DeGameTV features and make the canonical journey the single truthful path.
