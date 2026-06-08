import { defineConfig, devices } from '@playwright/test';

const MOCK_PORT = 8788;

export default defineConfig({
  testDir: './tests/a11y',
  outputDir: './tests/a11y/results',
  reporter: 'list',

  use: {
    viewport: { width: 1280, height: 800 },
    locale: 'de-DE',
  },

  timeout: 90_000,

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
      command: 'pnpm --filter @sdarm/events dev',
      url: 'http://localhost:3003',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        API_URL: `http://localhost:${MOCK_PORT}/api/v1`,
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
