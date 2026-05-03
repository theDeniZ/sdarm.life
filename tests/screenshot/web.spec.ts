import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const SCREENSHOT_PARAMS = '?screenshot=1&screenshotLocation=Pforzheim&screenshotTime=14:30';

test('web / home', async ({ page }) => {
  await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
  // Wait for PlanetEarth WebGL canvas to mount (it uses Suspense fallback={null})
  await page.waitForSelector('canvas', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000); // allow globe textures to load
  await expect(page).toHaveScreenshot('web-home.png', { fullPage: true });
});

test('web / about', async ({ page }) => {
  await page.goto(`${BASE}/de/about${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('web-about.png', { fullPage: true });
});

test('web / kontakt', async ({ page }) => {
  await page.goto(`${BASE}/de/kontakt${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('web-kontakt.png', { fullPage: true });
});

test('web / post detail', async ({ page }) => {
  await page.goto(`${BASE}/de/posts/test-post${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('web-post-detail.png', { fullPage: true });
});

test('web / datenschutz', async ({ page }) => {
  await page.goto(`${BASE}/de/datenschutz${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('web-datenschutz.png', { fullPage: true });
});

test('web / impressum', async ({ page }) => {
  await page.goto(`${BASE}/de/impressum${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('web-impressum.png', { fullPage: true });
});
