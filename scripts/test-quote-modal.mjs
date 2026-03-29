/**
 * QuoteShareModal visual test script
 *
 * Screenshots the modal in every theme × format combination.
 * Requires: pnpm add -D playwright (+ npx playwright install chromium)
 *
 * Usage:
 *   # Start dev server first: pnpm --filter @sdarm/web dev
 *   node scripts/test-quote-modal.mjs
 *
 * Output: scripts/quote-modal-shots/*.jpg
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, 'quote-modal-shots');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const FORMATS = ['square', 'portrait', 'story', 'wide'];
const THEMES = ['wald', 'nacht', 'vanilla', 'sand', 'duomo'];

async function run() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log(`Opening ${BASE_URL}/de ...`);
  await page.goto(`${BASE_URL}/de`, { waitUntil: 'networkidle' });

  // Open the modal via the share button in NewsSection
  const btn = page.locator('.quote-save-btn').first();
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  await btn.click();

  const modal = page.locator('.qsm-overlay.open');
  await modal.waitFor({ state: 'visible', timeout: 5_000 });
  console.log('Modal opened.');

  for (const fmt of FORMATS) {
    // Click format button
    const fmtBtn = page.locator(`.qsm-fmt`).filter({ hasText: fmtLabel(fmt) });
    await fmtBtn.click();
    await page.waitForTimeout(120); // let canvas re-render

    for (const theme of THEMES) {
      // Click theme swatch
      await page.locator(`.qsm-theme[data-theme="${theme}"]`).click();
      await page.waitForTimeout(120);

      const filename = join(OUT, `${fmt}_${theme}.jpg`);
      await modal.screenshot({ path: filename, type: 'jpeg', quality: 90 });
      console.log(`  saved: ${fmt} × ${theme}`);
    }
  }

  await browser.close();
  console.log(`\nDone. ${FORMATS.length * THEMES.length} screenshots → ${OUT}`);
}

function fmtLabel(fmt) {
  return { square: 'Post', portrait: '4:5', story: 'Story', wide: 'Wide' }[fmt];
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
