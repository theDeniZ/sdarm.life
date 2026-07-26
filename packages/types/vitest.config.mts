import { defineConfig } from 'vitest/config';

// Plain node environment — this package is pure TypeScript with no Worker
// bindings, so it does not need @cloudflare/vitest-pool-workers (see docs/testing.md).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
