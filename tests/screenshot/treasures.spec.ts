import { expect } from '@playwright/test';
import { forEachTheme } from './helpers/themes';

const BASE = 'http://localhost:3004';
const SCREENSHOT_PARAMS = '?screenshotLocation=Pforzheim&screenshotTime=14:30';

// Acceptance widths from docs/conventions.md "Responsive — check every frontend
// change". 1280 is the default Playwright viewport (configured in
// playwright.config.ts); the others are explicit so the catalog redesign is
// pinned at the breakpoints we actually verify.
const VIEWPORTS: { name: string; width: number; height: number }[] = [
  { name: 'mobile', width: 375, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 800 },
  { name: 'desktop', width: 1280, height: 800 },
];

async function waitForCatalog(page: import('@playwright/test').Page) {
  // TreasureCatalog fetches on mount and shows .shop-spinner while loading
  await page.waitForFunction(() => !document.querySelector('.shop-spinner'), { timeout: 15_000 });
  await page.waitForTimeout(1200); // stagger animation: 55ms × up to 20 cards
}

for (const vp of VIEWPORTS) {
  forEachTheme(`treasures / catalog / ${vp.name}`, async (page, theme) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
    await waitForCatalog(page);
    await expect(page).toHaveScreenshot(`treasures-catalog-${vp.name}-${theme}.png`, { fullPage: true });
  });
}
