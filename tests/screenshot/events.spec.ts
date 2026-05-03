import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3003';
const SCREENSHOT_PARAMS = '?screenshotLocation=Pforzheim&screenshotTime=14:30';

test('events / home', async ({ page }) => {
  await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('events-home.png', { fullPage: true });
});
