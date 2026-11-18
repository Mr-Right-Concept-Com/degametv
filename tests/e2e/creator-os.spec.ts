import { createHmac } from 'node:crypto';
import { expect, test } from 'playwright/test';

const creatorEmail = process.env.DEGAMETV_E2E_CREATOR_EMAIL;
const creatorPassword = process.env.DEGAMETV_E2E_CREATOR_PASSWORD;
const supabaseUrl = process.env.DEGAMETV_E2E_SUPABASE_URL;
const webhookSecret = process.env.DEGAMETV_E2E_WEBHOOK_SECRET;
const providerReference = process.env.DEGAMETV_E2E_PROVIDER_REFERENCE;
const signatureHeader = process.env.DEGAMETV_E2E_SIGNATURE_HEADER || 'x-provider-signature';
const signatureAlgorithm = (process.env.DEGAMETV_E2E_SIGNATURE_ALGORITHM || 'SHA-512').toUpperCase();
const hashAlgorithm = signatureAlgorithm === 'SHA-256' ? 'sha256' : 'sha512';

test('public sign-in route renders', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});

test('approved creator can select free admission without entering prices', async ({ page }) => {
  test.skip(!creatorEmail || !creatorPassword, 'Set dedicated approved-creator E2E credentials to run this test.');

  await page.goto('/auth');
  await page.locator('#email').fill(creatorEmail!);
  await page.locator('#password').fill(creatorPassword!);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth$/);

  await page.goto('/studio/create?flow=live&type=live');
  const freeAccess = page.getByRole('button', { name: 'Free access', exact: true });
  const paidTickets = page.getByRole('button', { name: 'Paid tickets', exact: true });
  await expect(freeAccess).toBeVisible();
  await freeAccess.click();
  await expect(freeAccess).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByPlaceholder('e.g. 2500')).toHaveCount(0);
  await expect(page.getByPlaceholder('e.g. 5')).toHaveCount(0);

  await paidTickets.click();
  await expect(paidTickets).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByPlaceholder('e.g. 2500')).toBeVisible();
  await expect(page.getByPlaceholder('e.g. 5')).toBeVisible();
});

test('signed provider events advance lifecycle and deduplicate retries', async ({ request }) => {
  test.skip(!supabaseUrl || !webhookSecret || !providerReference,
    'Configure a disposable, provider-provisioned WAITING_FOR_ENCODER stream and webhook secret to run provider lifecycle E2E.');

  const send = async (eventType: string, eventId: string) => {
    const body = JSON.stringify({
      id: eventId,
      provider_reference: providerReference,
      type: eventType,
    });
    const signature = createHmac(hashAlgorithm, webhookSecret!).update(body).digest('hex');
    const response = await request.post(`${supabaseUrl}/functions/v1/live-stream-webhook`, {
      data: body,
      headers: {
        'content-type': 'application/json',
        [signatureHeader]: signature,
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    return response.json() as Promise<{ received?: boolean; duplicate?: boolean; lifecycle_status?: string }>;
  };

  const suffix = `${Date.now()}`;
  const connectedId = `creator-e2e-${suffix}-connected`;
  const connected = await send('connected', connectedId);
  expect(connected.lifecycle_status).toBe('ENCODER_CONNECTED');

  const duplicate = await send('connected', connectedId);
  expect(duplicate.duplicate).toBe(true);

  const active = await send('live', `creator-e2e-${suffix}-active`);
  expect(active.lifecycle_status).toBe('LIVE');

  const disconnected = await send('disconnected', `creator-e2e-${suffix}-disconnected`);
  expect(disconnected.lifecycle_status).toBe('ENCODER_DISCONNECTED');

  const reconnected = await send('connected', `creator-e2e-${suffix}-reconnected`);
  expect(reconnected.lifecycle_status).toBe('ENCODER_CONNECTED');

  const ended = await send('ended', `creator-e2e-${suffix}-ended`);
  expect(ended.lifecycle_status).toBe('PROCESSING_REPLAY');
});
