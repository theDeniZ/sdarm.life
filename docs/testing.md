# Screenshot Tests

Visual regression tests using Playwright. Tests run against a mock API so no real Cloudflare infrastructure is needed.

## Test inventory

| Spec file | App | Port | Pages |
|---|---|---|---|
| `tests/screenshot/web.spec.ts` | `@sdarm/web` | 3000 | home, about, kontakt, post detail, datenschutz, impressum |
| `tests/screenshot/songbook.spec.ts` | `@sdarm/songbook` | 3002 | home, song view |
| `tests/screenshot/events.spec.ts` | `@sdarm/events` | 3003 | home |
| `tests/screenshot/treasures.spec.ts` | `@sdarm/treasures` | 3004 | catalog |

**10 pages × 2 themes = 20 tests total.** Every page is captured in both dark and light theme via the `forEachTheme` helper (see [Themes](#themes) below). All run on Chromium, 1280×800, `de-DE` locale.

## Running tests

```bash
# One-time: download the Chromium browser binary
pnpm test:screenshots:install

# Run all screenshot tests (from monorepo root)
pnpm test:screenshots

# Update baseline snapshots after intentional visual changes
pnpm test:screenshots:update
```

Only Chromium is installed — `playwright.config.ts` targets a single `chromium` project, so the WebKit and Firefox downloads (and their large set of system libraries) are skipped. The matching `apt` packages for Chromium are baked into [.devcontainer/Dockerfile](../.devcontainer/Dockerfile); CI installs them via `playwright install --with-deps chromium` (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) and [`update-snapshots.yml`](../.github/workflows/update-snapshots.yml)).

Playwright starts everything automatically:
- Mock API server on port 8788
- All four Next.js apps in dev mode (ports 3000, 3002, 3003, 3004)

First run takes ~2 minutes while Next.js compiles. Subsequent runs reuse the running servers (in local dev mode).

Each Next.js dev server is started with `NODE_ENV=test` — this makes Next.js skip `.env.local`, so the per-app `API_URL=http://localhost:8787/api/v1` from `.env.local` (which points at `wrangler dev`) does not override the `API_URL=http://localhost:8788/api/v1` set by `playwright.config.ts` (which points at the mock server). Without `NODE_ENV=test`, `.env.local` wins and the apps render empty pages / 404s because nothing is listening on 8787 during tests.

## Architecture

```
tests/screenshot/
  mock-server/
    index.ts        — Node.js HTTP server (port 8788); no Hono, no Worker runtime
    data.ts         — static fixtures (all image keys null — no R2 needed)
  helpers/
    themes.ts       — forEachTheme() helper; runs each capture for dark + light
  web.spec.ts
  songbook.spec.ts
  events.spec.ts
  treasures.spec.ts
  snapshots/        — committed baseline PNGs (platform-agnostic filenames — see Snapshot files)
  results/          — gitignored; actual screenshots on failure
playwright.config.ts
```

The mock server intercepts all API calls the apps make during page load. It serves a fixed, deterministic dataset so screenshots are stable across runs.

## Screenshot query parameters

All test URLs include `?screenshotLocation=Pforzheim&screenshotTime=14:30`. The web app home also gets `?screenshot=1`.

| Param | Effect |
|---|---|
| `screenshot=1` | Freezes dynamic elements on the web home page (used by `PlanetEarth` and any other time-sensitive component that opts in) |
| `screenshotLocation=Pforzheim` | Sets the sunset clock location to Pforzheim so the SVG ring is deterministic |
| `screenshotTime=14:30` | Fixes the sunset clock to 14:30 so the countdown is stable |

## Themes

Every page is captured in **both `dark` and `light` theme** via the `forEachTheme` helper in `tests/screenshot/helpers/themes.ts`. The helper runs each capture twice — once per theme — and writes the theme into `localStorage.sdarm-theme` via `page.addInitScript()` before navigation, so the inline `ThemeScript` in `<head>` applies it before first paint (same path a real user takes, no FOUC).

A spec test looks like:

```ts
import { forEachTheme } from './helpers/themes';

forEachTheme('web / home', async (page, theme) => {
  await page.goto(`${BASE}/de${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`web-home-${theme}.png`, { fullPage: true });
});
```

This produces two tests — `web / home / dark` and `web / home / light` — and two snapshot files — `web-home-dark.png` and `web-home-light.png`.

**Always include `-${theme}` in the screenshot filename**, otherwise the second iteration overwrites the first.

## Snapshot files

Baselines are stored in `tests/screenshot/snapshots/` and committed to git. Filenames are **platform-agnostic** (just `{page}-{theme}.png`) — `snapshotPathTemplate` in `playwright.config.ts` strips Playwright's default `-chromium-{platform}` suffix so baselines generated locally on macOS and in CI on Ubuntu share the same files. Cross-platform font/AA differences are absorbed by `maxDiffPixelRatio: 0.005`.

When a test fails because the visual output changed:
1. Check the diff in `tests/screenshot/results/` — each failing test gets an `actual`, `expected`, and `diff` image.
2. If the change is intentional, run `pnpm test:screenshots:update` to regenerate the baselines.
3. Commit the updated PNGs together with the code change.

**Do not commit updated snapshots without reviewing the diff.** A failing screenshot is a signal — not noise.

## Adding a test for an existing app

1. Open (or create) the spec file for the relevant app.
2. Add a `forEachTheme()` block — never a bare `test()`, so the page is covered in both themes:

```ts
// Always include the standard params
const SCREENSHOT_PARAMS = '?screenshotLocation=Pforzheim&screenshotTime=14:30';

forEachTheme('songbook / my new page', async (page, theme) => {
  await page.goto(`${BASE}/de/my-path${SCREENSHOT_PARAMS}`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`songbook-my-new-page-${theme}.png`, { fullPage: true });
});
```

3. If the page fetches a new API route, add the mock (see below).
4. Run `pnpm test:screenshots:update` to generate both baselines (dark + light).
5. Review the new PNGs, then commit them with the spec file.

**When to use `waitForLoadState('networkidle')` vs a fixed timeout:**
- `networkidle` — works for most pages (waits until no in-flight requests for 500 ms).
- Fixed `waitForTimeout` — needed for WebGL (globe), stagger animations, or any async rendering that fires after `networkidle`. Use the smallest value that makes the test stable.

## Adding a mock endpoint

The mock server only implements routes the tests actually hit. To add a new one:

1. **Add fixtures** to `tests/screenshot/mock-server/data.ts`:

```ts
export const mockMyData = {
  id: 1,
  title: 'Test item',
  // set all image/file keys to null
  coverKey: null,
};
```

2. **Wire up the route** in `tests/screenshot/mock-server/index.ts`:

```ts
import { mockMyData } from './data';

// inside handleRequest():
if (url === '/api/v1/my-endpoint') {
  sendJSON(res, 200, mockMyData);
  return;
}
```

3. If the route returns a list, wrap it: `sendJSON(res, 200, { items: [mockMyData], total: 1 })`.

**Rules for mock data:**
- Set all `*_key` / `coverKey` / `thumbKey` fields to `null` — the mock server has no R2.
- Set all URLs to `'#'` or `null` to avoid real network calls from the browser.
- Keep data minimal — just enough for the component to render meaningfully.

## Adding tests for a new app

1. Add a new spec file: `tests/screenshot/{app}.spec.ts`.
2. Add a `webServer` entry to `playwright.config.ts`:

```ts
{
  command: 'pnpm --filter @sdarm/myapp dev',
  url: 'http://localhost:300X',   // pick an unused port
  timeout: 120_000,
  reuseExistingServer: !process.env.CI,
  env: {
    API_URL: `http://localhost:${MOCK_PORT}/api/v1`,
    R2_URL:  `http://localhost:${MOCK_PORT}/images`,
    WEB_URL: 'http://localhost:3000',
  },
},
```

3. Add any routes the new app needs to the mock server.
4. Run `pnpm test:screenshots:update` and commit the baselines.

## CI

Playwright is not wired into CI yet — tests run manually. Snapshots are committed so the baselines are always available. When CI is added, use `pnpm test:screenshots` without `--update-snapshots` (failures will surface visual regressions).

---

# Accessibility (axe-core) Tests

Automated WCAG 2.1 AA checks using `@axe-core/playwright`. Tests run against the same mock API as the screenshot tests — no real Cloudflare infrastructure needed.

## Running

```bash
# Run all accessibility tests
pnpm test:a11y
```

Config: `playwright.a11y.config.ts`. Results (failures) go to `tests/a11y/results/` (gitignored).

## Test inventory

| Pages tested | App | Port |
|---|---|---|
| `/de`, `/en` | `@sdarm/web` | 3000 |
| `/de/about` | `@sdarm/web` | 3000 |
| `/de` | `@sdarm/songbook` | 3002 |
| `/de` | `@sdarm/events` | 3003 |
| `/de` | `@sdarm/treasures` | 3004 |

All tests load the page, wait for `networkidle`, then run `axe-core` across the full DOM.

## Excluded rules

| Rule | Reason |
|---|---|
| `color-contrast` | Checked manually (dark theme `--muted` raised to 4.6:1). axe mis-fires on text over gradients/images — false positives. |
| `aria-allowed-attr` | Three.js `<canvas>` has no ARIA support; excluded globally. |

`<canvas>` elements are also excluded from the axe scan via `.exclude('canvas')`.

## Adding a test

Add pages to the `PAGES` array in `tests/a11y/a11y.spec.ts`. If the page requires a new mock API route, add it to `tests/screenshot/mock-server/index.ts` (the a11y tests reuse the same mock server).
