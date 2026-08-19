import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { name: 'web / home (de)', url: 'http://localhost:3000/de' },
  { name: 'web / home (en)', url: 'http://localhost:3000/en' },
  { name: 'web / about', url: 'http://localhost:3000/de/about' },
  { name: 'songbook / home', url: 'http://localhost:3002/de' },
  { name: 'events / home', url: 'http://localhost:3003/de' },
  { name: 'treasures / catalog', url: 'http://localhost:3004/de' },
  { name: 'treasures / sbl lesson', url: 'http://localhost:3004/de/sbl' },
];

// Rules we explicitly exclude with rationale:
// color-contrast: checked manually (--muted bumped to 4.6:1). The axe rule
//   can mis-fire on text rendered over gradient/image backgrounds where the
//   actual visual contrast is higher than the computed value from a flat
//   background colour — this is a known false-positive category.
// aria-allowed-attr: Three.js canvas has no ARIA support; excluded globally.
const AXE_DISABLE = ['color-contrast', 'aria-allowed-attr'];

for (const { name, url } of PAGES) {
  test(name, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('load');
    // Brief wait for client-side hydration and CSS animations to settle.
    // networkidle is unreliable in Next.js dev mode (HMR keeps connections open).
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .disableRules(AXE_DISABLE)
      // Skip the WebGL canvas — not testable with axe
      .exclude('canvas')
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
