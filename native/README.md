# DeGameTV Native

Flutter application workspace for DeGameTV on Android, iOS, Windows, macOS and Linux. The React/Vite website remains the canonical web application. Native clients use the same Supabase project and backend contracts; they do not create a second content database.

## Local setup

1. Install the current stable Flutter SDK and the toolchain for the target platform.
2. From this directory run `flutter pub get`.
3. Run with the public Supabase project URL and publishable (or legacy anon) key:

```sh
flutter run \
  --dart-define=SUPABASE_URL=https://dxijsbbdtwtbwdaajiyn.supabase.co \
  --dart-define=SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Only the Supabase publishable/anon key belongs in a client app. Never use a service-role or secret key.

## Verified native/backend integration

- Supabase Auth uses the same DeGameTV identities as the web application.
- The published catalogue reads the existing `screenings` table and runtime-config endpoint.
- The ticket wallet reads `user_ticket_entitlements`, an existing `security_invoker=true` view whose underlying RLS policies remain authoritative. Entitlement snapshots are cached in platform secure storage per signed-in user for offline display. Cached data is explicitly stale and is never accepted as proof for playback.
- Personal Wallet balances and activity use `get_my_personal_wallet_balances` and `get_my_wallet_activity`; tenant context uses `get_my_tenant_config`. All three RPCs require an authenticated user and are invoked through that user's Supabase session.
- Legacy screening playback first calls `validate-watch-code`, then `get-playback-url` with a fresh UUID playback session. Live/replay playback calls `authorize-live-playback` with the entitlement's stream ID and requested mode. The player accepts only HTTPS URLs returned by the backend. A fresh online server authorization is mandatory; offline entitlement cache never unlocks media.
- Screening checkout uses `process-payment`; live-event checkout uses `process-live-payment`. Personal Wallet is offered alongside external payment methods returned by the existing read-only `list-payment-methods` function. External checkout opens only a backend-returned HTTPS URL. The app refreshes entitlements and wallet state when it resumes after checkout.
- The country-to-currency lookup uses the existing enabled `country_currency_rules` table. Checkout amounts, eligibility, provider credentials, and payment settlement remain server-authoritative.
- Android, iOS and macOS register the `degametv://` custom scheme for tickets, playback, support, dashboard, Creator Studio and checkout-return routes. Windows/Linux installers still need OS-level protocol-handler registration. HTTPS deep links are accepted only when their host matches the canonical URL published by runtime-config. Universal/App Links association files must still be published by the domain operator before HTTPS links can open the app directly.

## Push notification status — operator/backend prerequisite

Push token registration is intentionally not activated. The connected Supabase project currently has no device-token registration table or registration Edge Function, and the native project has no Firebase Android/iOS app credentials. The app surfaces this as **Notifications — not configured**; it does not fabricate tokens, write tokens into an unrelated table, or silently claim registration succeeded. To complete push delivery, configure Firebase/APNs for the native bundle identifiers and provide an authenticated, tenant-aware device registration/revocation contract before enabling token sync.

## Native code completed in this tranche

- Unified ticket entitlement parsing and secure per-user offline cache.
- Online-only playback authorization for legacy screening tickets and live/replay entitlements.
- Personal Wallet balance/activity/tenant context and authenticated native checkout handoff.
- External provider checkout discovery and safe browser handoff.
- Custom-scheme deep-link routing for tickets, playback, support, dashboard, Creator Studio and checkout return.
- Unit tests for entitlement parsing, secure-cache serialization, wallet response parsing, checkout/playback URL validation and deep-link routing.

## CI, signing and store-release prerequisites

GitHub Actions in `.github/workflows/native-flutter-validate.yml` runs formatting, analysis and tests. `.github/workflows/native-flutter-build.yml` builds Android App Bundle, an unsigned iOS device app, and desktop release artifacts. The workflows regenerate Flutter platform runners before validation/build; `tool/configure_platforms.mjs` reapplies DeGameTV branding and the custom deep-link scheme after generation.

The code and unsigned CI artifacts are not store-ready signed releases. Operators must still configure:

- Android production upload keystore, Play App Signing, final application ID, release signing secrets and Play Console metadata.
- Apple Developer Team, bundle ID registration, signing certificates, provisioning profiles, APNs key/capabilities and App Store Connect metadata.
- Firebase project, Android `google-services.json`, iOS `GoogleService-Info.plist`, APNs credentials and the backend device-token registration contract before enabling push.
- Apple Associated Domains and a valid `apple-app-site-association` file; Android verified App Links and a valid `assetlinks.json` file for the canonical domain.
- Privacy manifests, privacy disclosures, store policy declarations, screenshots, age ratings and regional compliance.
- Desktop signing/notarization and platform-specific packaging for public distribution.

No store submission, signing, APNs/FCM delivery, DRM certification, or physical-device playback certification is claimed by this repository change.
