import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const password = 'Demo1234!';

async function expectNoCriticalViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();

  expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
}

test('login page has labelled controls and no critical axe violations', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  await expectNoCriticalViolations(page);
});

test('teacher can keyboard-select a book card', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('teacher1@demo.com');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('**/teacher');
  await page.getByRole('link', { name: 'Create Reading Assignment' }).click();

  const aliceCard = page.getByRole('button', { name: /Select Alice in Wonderland/i });
  await aliceCard.focus();
  await page.keyboard.press('Enter');

  await expect(aliceCard).toHaveAttribute('aria-pressed', 'true');
});
