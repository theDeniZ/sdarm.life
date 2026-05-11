import { expect } from '@playwright/test';
import { forEachTheme } from './helpers/themes';

const BASE = 'http://localhost:3000';
const SCREENSHOT_PARAMS = '?screenshot=1&screenshotLocation=Pforzheim&screenshotTime=14:30';

forEachTheme('web / home', async (page, theme) => {
  await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
  // Wait for PlanetEarth WebGL canvas to mount (it uses Suspense fallback={null})
  await page.waitForSelector('canvas', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000); // allow globe textures to load
  await expect(page).toHaveScreenshot(`web-home-${theme}.png`, { fullPage: true });
});

forEachTheme('web / about', async (page, theme) => {
  await page.goto(`${BASE}/de/about${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`web-about-${theme}.png`, { fullPage: true });
});

forEachTheme('web / kontakt', async (page, theme) => {
  await page.goto(`${BASE}/de/kontakt${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`web-kontakt-${theme}.png`, { fullPage: true });
});

forEachTheme('web / post detail', async (page, theme) => {
  await page.goto(`${BASE}/de/posts/test-post${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`web-post-detail-${theme}.png`, { fullPage: true });
});

forEachTheme('web / datenschutz', async (page, theme) => {
  await page.goto(`${BASE}/de/datenschutz${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`web-datenschutz-${theme}.png`, { fullPage: true });
});

forEachTheme('web / impressum', async (page, theme) => {
  await page.goto(`${BASE}/de/impressum${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`web-impressum-${theme}.png`, { fullPage: true });
});
