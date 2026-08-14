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
  // StatsGrid replaced the masonry section on the home page. Two things happen
  // after hydration and both change what the cards look like: the verse card is
  // filled by an effect (the hour-based pick is kept out of SSR to avoid a
  // hydration mismatch, so it is empty in the server HTML), and every
  // [data-fit] headline is then stepped down a size ladder until it fits its
  // card. Screenshotting before both have run captures a blank quote card and
  // unfitted type.
  await page.waitForFunction(
    () => {
      const ref = document.querySelector('.stats__card--quote .stats__card-sub');
      if (!ref?.textContent?.trim()) return false;
      const headlines = Array.from(document.querySelectorAll<HTMLElement>('.stats [data-fit]'));
      return headlines.length > 0 && headlines.every((el) => el.style.fontSize !== '');
    },
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
