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
- Ticket checkout, payment and protected playback should continue to use the canonical DeGameTV web/backend flows until native parity is implemented and separately certified. The native ticket destination currently provides an account sign-in gate, not a replacement ticket wallet.
- Native code and plugin changes require store-distributed binaries. Content, screening and database changes do not require a new store release.

## CI and release artifacts

GitHub Actions in `.github/workflows/native-flutter-validate.yml` runs formatting, analysis and tests. `.github/workflows/native-flutter-build.yml` builds Android App Bundle, iOS device build (without signing), and desktop release artifacts. Add the repository Actions secret `SUPABASE_PUBLISHABLE_KEY` before distributing builds. The project URL is public and configured in the workflow.

The current iOS artifact is intentionally unsigned and is not an App Store upload. Android release output also needs a production upload keystore and Play App Signing configuration before store submission. Configure Apple Team/certificates/profiles, Android keystore secrets, app identifiers, push-notification entitlements, privacy manifests, store metadata and policy declarations before submitting. Desktop packages need platform signing/notarization for public distribution.

## Current implementation boundary

This is the first native application tranche: shared Supabase initialization, email/password sign-in, responsive navigation, live-updating published screening catalogue, branded UI and CI build scaffolding. It does not yet claim complete native parity for ticket wallet, checkout, video playback/DRM, creator studio, live broadcasting, push notifications or downloads. Those must be integrated against their existing backend contracts and tested per platform before store release.
