import { test, type Page } from '@playwright/test';

export type Theme = 'dark' | 'light';

export const THEMES: Theme[] = ['dark', 'light'];

/**
 * Run the same screenshot capture for both themes. The theme value is written
 * to `localStorage.sdarm-theme` via `addInitScript` before navigation, so the
 * inline `ThemeScript` in `<head>` reads it and applies `data-theme` to
 * `<html>` before first paint — same path a real user takes within a single
 * app. (Cross-app navigation uses the `?theme=` URL param; that path is
 * exercised implicitly when the test navigates between subdomains.)
 *
 * Each iteration produces a snapshot named `${baseName}-${theme}.png`.
 */
export function forEachTheme(
  name: string,
  capture: (page: Page, theme: Theme) => Promise<void>,
) {
  for (const theme of THEMES) {
    test(`${name} / ${theme}`, async ({ page }) => {
      await page.addInitScript((t) => {
        try {
          localStorage.setItem('sdarm-theme', t);
        } catch {
          /* ignore */
        }
      }, theme);
      await capture(page, theme);
    });
  }
}
