# DeGameTV Creator OS E2E

Run the browser suite with `npm run test:e2e`.

The public sign-in smoke test runs without credentials. The creator workbench test requires a dedicated, approved, KYC-verified test creator:

- `DEGAMETV_E2E_CREATOR_EMAIL`
- `DEGAMETV_E2E_CREATOR_PASSWORD`
- optionally `DEGAMETV_E2E_BASE_URL` to target a deployed test environment

The provider lifecycle test is deliberately opt-in. It mutates one disposable stream through connected, live, disconnected, reconnected and ended states. It requires a provider-provisioned stream initially in `WAITING_FOR_ENCODER`, with a valid Vault webhook secret configured on the matching provider binding:

- `DEGAMETV_E2E_SUPABASE_URL`
- `DEGAMETV_E2E_WEBHOOK_SECRET`
- `DEGAMETV_E2E_PROVIDER_REFERENCE`
- optionally `DEGAMETV_E2E_SIGNATURE_HEADER` and `DEGAMETV_E2E_SIGNATURE_ALGORITHM` (`SHA-512` by default)

Use a disposable test stream and dedicated test credentials. Do not point the lifecycle test at a real production broadcast.
