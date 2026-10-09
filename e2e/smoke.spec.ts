import { expect, test } from '@playwright/test';

test('marketing page loads and demo role login works', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Advancing mathematical excellence for every Rwandan student' })).toBeVisible();

  await page.goto('/login');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Choose a role' })).toBeVisible();

  await page.getByRole('button', { name: /Student Demo/i }).click();
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole('heading', { name: /Good morning, Alice/i })).toBeVisible();

  await page.getByRole('button', { name: /Sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});
