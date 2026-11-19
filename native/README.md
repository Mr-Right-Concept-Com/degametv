# DeGameTV Native

Flutter application workspace for DeGameTV on Android, iOS, Windows, macOS and Linux. The existing React/Vite website remains the canonical web application. Native clients use the same Supabase project and published catalogue; they do not create a second content database.

## Local setup

1. Install the current stable Flutter SDK and platform toolchains.
2. From this directory run `flutter create --platforms=android,ios,windows,macos,linux --org com.degametv --project-name degametv_native .` to generate the platform runner projects.
3. Run `flutter pub get`.
4. Run with the public Supabase project URL and publishable (or legacy anon) key:

```sh
flutter run \
  --dart-define=SUPABASE_URL=https://dxijsbbdtwtbwdaajiyn.supabase.co \
  --dart-define=SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Only the Supabase publishable/anon key belongs in a client app. Never use a service-role or secret key.

## Shared product contract

- Supabase Auth authenticates the same DeGameTV identities used on web.
- The native catalogue reads published `screenings` under the existing Row Level Security policies.
- Supabase Realtime listens for screening changes and refreshes the catalogue. This requires the `screenings` table to be enabled in the Supabase Realtime publication; if it is not enabled, pull-to-refresh remains available.
- The native client fetches the shared `runtime-config` endpoint for country-aware regional ticket pricing and the published canonical web URL. God Mode controls the canonical web URL; no Vercel hostname is embedded in the native source. If the URL has not been published, external dashboard and Creator Studio links fail with an explanatory message instead of opening a stale preview domain.
- Native sign-in, registration and password recovery use the existing Supabase Auth project.
- The native ticket wallet reads only the signed-in user's non-revoked `tickets` rows through the existing RLS policies. Full ticket redemption, guest claims and checkout continue through canonical DeGameTV web/backend flows. Native playback accepts a watch code and email, requests a short-lived grant from the existing `get-playback-url` Edge Function, and only plays the provider-authorized URL; Windows/Linux open the secure grant in the browser. If the provider is not configured, playback fails closed. DRM certification and live playback are not yet complete.
- The account menu routes users to the canonical dashboard and protected Creator Studio using the runtime-published web URL, so creator approval and backend authorization remain authoritative.
- Native code and plugin changes require store-distributed binaries. Content, screening and database changes do not require a new store release.

## CI and release artifacts

GitHub Actions in `.github/workflows/native-flutter-validate.yml` runs formatting, analysis and tests. `.github/workflows/native-flutter-build.yml` builds Android App Bundle, iOS device build (without signing), and desktop release artifacts. Add the repository Actions secret `SUPABASE_PUBLISHABLE_KEY` before distributing builds. Generated platform shells are branded by `tool/configure_platforms.mjs`. The project URL is public and configured in the workflow.

The current iOS artifact is intentionally unsigned and is not an App Store upload. Android release output also needs a production upload keystore and Play App Signing configuration before store submission. Configure Apple Team/certificates/profiles, Android keystore secrets, app identifiers, push-notification entitlements, privacy manifests, store metadata and policy declarations before submitting. Desktop packages need platform signing/notarization for public distribution.

## Current implementation boundary

The current native tranche includes shared Supabase initialization, email/password sign-in, account creation, password recovery, a responsive screening catalogue, live screening refresh, a native ticket wallet, branded account navigation, and canonical web entry points for checkout, ticket redemption, dashboard and Creator Studio. It does not yet provide native checkout/payment, DRM certification, native live broadcasting/OBS controls, push notifications, offline downloads, or full native Creator Studio workflows. These remain release blockers and must be implemented against their existing backend contracts and tested on physical devices.
