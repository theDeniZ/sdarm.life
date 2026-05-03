import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3004';
const SCREENSHOT_PARAMS = '?screenshotLocation=Pforzheim&screenshotTime=14:30';

test('treasures / catalog', async ({ page }) => {
  await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
  // TreasureCatalog fetches on mount and shows .shop-spinner while loading
  await page.waitForFunction(() => !document.querySelector('.shop-spinner'), { timeout: 15_000 });
  await page.waitForTimeout(1200); // stagger animation: 55ms × up to 20 cards
  await expect(page).toHaveScreenshot('treasures-catalog.png', { fullPage: true });
});
