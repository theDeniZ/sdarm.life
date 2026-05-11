import { expect } from '@playwright/test';
import { forEachTheme } from './helpers/themes';

const BASE = 'http://localhost:3003';
const SCREENSHOT_PARAMS = '?screenshotLocation=Pforzheim&screenshotTime=14:30';

forEachTheme('events / home', async (page, theme) => {
  await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`events-home-${theme}.png`, { fullPage: true });
});
