import { expect, test } from '@playwright/test';

/* The lesson is a route of Schätze, not an app of its own — same server as the
 * catalogue, on port 3004. */
const BASE = 'http://localhost:3004';

/* Deliberately not `forEachTheme`. The sheet is paper: it has one appearance,
 * light, and it never loads the site's theme tokens — a lesson made to be
 * printed cannot have a dark mode. Running this twice would only write the same
 * PNG under two names. */

/* The page picks its lesson from today's date, so the clock is pinned to a day
 * inside the fixture quarter's week 8 (Sun 16 – Sat 22 August 2026). Without
 * this the baseline would go stale the moment the week turned. */
const FIXED_DAY = new Date('2026-08-19T10:00:00Z');

test('treasures / sbl lesson', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_DAY);
  await page.goto(`${BASE}/de/sbl`);
  /* The sheet is built after the quarter arrives, and the engine then scrolls
     to the day being read — wait for the lesson title, then put the sheet back
     to the top so the capture always starts in the same place. */
  await page.waitForSelector('.sbl h1.title', { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, 0));
  /* Next's own dev-tools badge is chrome, not page: leaving it in would tie the
     baseline to the Next version rather than to the sheet. */
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await expect(page).toHaveScreenshot('sbl-lesson.png', { fullPage: true });
});
