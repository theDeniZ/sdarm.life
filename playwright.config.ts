import { defineConfig, devices } from '@playwright/test';

const MOCK_PORT = 8788;

export default defineConfig({
  testDir: './tests/screenshot',
  snapshotDir: './tests/screenshot/snapshots',
  // Drop the {platform} segment so darwin-generated baselines (locally) and
  // linux-generated baselines (CI) live at the same path. Trade-off: any
  // platform-specific font/AA differences must fit inside maxDiffPixelRatio.
  snapshotPathTemplate: '{snapshotDir}/{testFileName}-snapshots/{arg}{ext}',
  outputDir: './tests/screenshot/results',
  reporter: 'list',

  use: {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'de-DE',
    animations: 'disabled',
    // Prevent Playwright from injecting `caret-color: transparent` on focusable
    // elements before React hydrates. That inline style causes a hydration
    // mismatch on Footer inputs (newsletter + location autocomplete).
    // Screenshots remain caret-free because inputs are not focused during tests.
    caret: 'initial',
  },

  timeout: 90_000,
  expect: { timeout: 15_000, toHaveScreenshot: { maxDiffPixelRatio: 0.005 } },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: `npx tsx tests/screenshot/mock-server/index.ts`,
      url: `http://localhost:${MOCK_PORT}/health`,
      timeout: 20_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @sdarm/web dev',
      url: 'http://localhost:3000',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        API_URL: `http://localhost:${MOCK_PORT}/api/v1`,
        R2_URL: `http://localhost:${MOCK_PORT}/images`,
        WEB_URL: 'http://localhost:3000',
        SONGBOOK_URL: 'http://localhost:3002',
        EVENTS_URL: 'http://localhost:3003',
        TREASURES_URL: 'http://localhost:3004',
      },
    },
    {
      // Use --webpack to avoid Turbopack panics when multiple dev servers start simultaneously
      command: 'cd apps/events && NODE_OPTIONS="--require ../../tools/silence-next-warnings.cjs" node_modules/.bin/next dev --port 3003 --webpack',
      url: 'http://localhost:3003',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        API_URL: `http://localhost:${MOCK_PORT}/api/v1`,
      },
    },
    {
      command: 'pnpm --filter @sdarm/songbook dev',
      url: 'http://localhost:3002',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        API_URL: `http://localhost:${MOCK_PORT}/api/v1`,
        R2_URL: `http://localhost:${MOCK_PORT}/images`,
        WEB_URL: 'http://localhost:3000',
      },
    },
    {
      command: 'pnpm --filter @sdarm/treasures dev',
      url: 'http://localhost:3004',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        API_URL: `http://localhost:${MOCK_PORT}/api/v1`,
        R2_URL: `http://localhost:${MOCK_PORT}/images`,
        WEB_URL: 'http://localhost:3000',
      },
    },
  ],
});
