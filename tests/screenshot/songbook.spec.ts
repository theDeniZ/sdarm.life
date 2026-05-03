import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3002';
const SCREENSHOT_PARAMS = '?screenshotLocation=Pforzheim&screenshotTime=14:30';

test('songbook / home', async ({ page }) => {
  await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('songbook-home.png', { fullPage: true });
});

test('songbook / song view', async ({ page }) => {
  await page.goto(`${BASE}/de/songbooks/gesangbuch/1${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // wait for async data loads
  await expect(page).toHaveScreenshot('songbook-song.png', { fullPage: true });
});
