import { expect } from '@playwright/test';
import { forEachTheme } from './helpers/themes';

const BASE = 'http://localhost:3000';
const SCREENSHOT_PARAMS = '?screenshot=1&screenshotLocation=Pforzheim&screenshotTime=14:30';

forEachTheme('web / home', async (page, theme) => {
  await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
  // Hard waits — no silent catches. If any of these never appear, the screenshot
  // captures a half-hydrated page (globe missing, cards empty, clock blank).
  // PlanetEarth WebGL canvas (Suspense fallback is null, so canvas == mounted).
  await page.waitForSelector('.hero-welcome canvas', { timeout: 30_000 });
  // The five bento cards. StatsGrid replaced NewsSection here, so the old
  // `.masonry-item.is-visible` wait could never resolve. The headline fitter
  // steps each card's type down until it fits, so wait for it to have run —
  // an unfitted headline is a different picture from a fitted one.
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.stats__card').length === 5 &&
      [...document.querySelectorAll<HTMLElement>('[data-fit]')].every((el) => el.style.fontSize !== ''),
    undefined,
    { timeout: 15_000 }
  );
  // Footer sunset clock hydrates from ?screenshotTime= and splits the value into
  // spans around a `.sunset-colon`. Until that exists, only the dash placeholder
  // shows, and the location label is also missing.
  await page.waitForSelector('.sunset-time-value .sunset-colon', { timeout: 15_000 });
  // Last short settle for WebGL texture upload + final frame.
  await page.waitForTimeout(1500);
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
