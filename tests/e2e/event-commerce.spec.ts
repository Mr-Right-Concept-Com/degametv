import { expect, test } from 'playwright/test';

const creatorEmail = process.env.DEGAMETV_E2E_CREATOR_EMAIL;
const creatorPassword = process.env.DEGAMETV_E2E_CREATOR_PASSWORD;
const invitedEmail = process.env.DEGAMETV_E2E_INVITED_EMAIL;
const invitedPassword = process.env.DEGAMETV_E2E_INVITED_PASSWORD;
const privateInviteToken = process.env.DEGAMETV_E2E_PRIVATE_INVITE_TOKEN;
const publicContentId = process.env.DEGAMETV_E2E_PUBLIC_CONTENT_ID;

async function signIn(page: any, email: string, password: string) {
  await page.goto('/auth');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth$/);
}

test('public content pages expose creator support without granting content access', async ({ page }) => {
  test.skip(!publicContentId, 'Set DEGAMETV_E2E_PUBLIC_CONTENT_ID to a published public content id.');
  await page.goto('/content/' + publicContentId);
  await expect(page.getByRole('heading', { name: 'Support this creator' })).toBeVisible();
  await expect(page.getByText('Contributions do not unlock content.')).toBeVisible();
  await expect(page.getByLabel('Support type')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send tip' })).toBeVisible();
  await page.getByLabel('Support type').selectOption('gift');
  await expect(page.getByLabel('Gift')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send gift' })).toBeVisible();
});

test('private invitation landing is token-gated and does not enter public discovery', async ({ page }) => {
  test.skip(!privateInviteToken, 'Set DEGAMETV_E2E_PRIVATE_INVITE_TOKEN to a disposable screening invitation token.');
  await page.goto('/invite/' + privateInviteToken);
  await expect(page.getByRole('heading', { name: /private screening invitation/i })).toBeVisible();
  await expect(page.getByText(/invited email address/i)).toBeVisible();
});

test('verified invited account can claim a complimentary pass exactly once', async ({ page }) => {
  test.skip(!privateInviteToken || !invitedEmail || !invitedPassword,
    'Set a disposable free-screening invitation and verified invited-user credentials.');
  await signIn(page, invitedEmail!, invitedPassword!);
  await page.goto('/invite/' + privateInviteToken);
  const claim = page.getByRole('button', { name: /accept and claim complimentary pass/i });
  await expect(claim).toBeVisible();
  await claim.click();
  await expect(page.getByText(/complimentary access pass has been issued/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /open my tickets/i })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/complimentary access pass has been issued/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /accept and claim complimentary pass/i })).toHaveCount(0);
});

test('approved creator can configure a scheduled event and its presales', async ({ page }) => {
  test.skip(!creatorEmail || !creatorPassword, 'Set a dedicated approved creator for event scheduling E2E.');
  await signIn(page, creatorEmail!, creatorPassword!);
  await page.goto('/studio/create?flow=live&type=live');
  await expect(page.getByPlaceholder('e.g. The Lagos Creators Live Experience')).toBeVisible();
  await page.getByPlaceholder('e.g. The Lagos Creators Live Experience').fill('Disposable scheduled event E2E');
  await page.getByRole('button', { name: 'Continue to event setup' }).click();
  await expect(page.getByText(/advance ticket sales/i)).toBeVisible();
  await expect(page.getByText(/early-bird/i)).toBeVisible();
  await expect(page.getByText(/event visibility/i)).toBeVisible();
  await expect(page.getByText(/settlement hold/i)).toBeVisible();
});
