import { expect } from '@playwright/test';
import { forEachTheme } from './helpers/themes';

const BASE = 'http://localhost:3002';
const SCREENSHOT_PARAMS = '?screenshotLocation=Pforzheim&screenshotTime=14:30';

forEachTheme('songbook / home', async (page, theme) => {
  await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`songbook-home-${theme}.png`, { fullPage: true });
});

forEachTheme('songbook / song view', async (page, theme) => {
  await page.goto(`${BASE}/de/songbooks/gesangbuch/1${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // wait for async data loads
  await expect(page).toHaveScreenshot(`songbook-song-${theme}.png`, { fullPage: true });
});
