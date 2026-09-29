import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';

// Read in Node at config time and handed to the Worker as a binding; a spec that
// needs tables calls applyD1Migrations(env.DB, env.TEST_MIGRATIONS) itself.
// The D1 starts empty otherwise — see docs/testing.md.
const migrations = await readD1Migrations(path.join(import.meta.dirname, '../../packages/db/migrations'));

// The pool is a Vite plugin now. The `@cloudflare/vitest-pool-workers/config`
// entrypoint that used to export `defineWorkersConfig` no longer exists — see
// docs/testing.md before "fixing" an import error here by bumping versions.
export default defineConfig({
	test: {
		// The first request to reach a simulated binding (e.g. LLM_RATE_LIMITER)
		// pays miniflare's cold start. Locally that is milliseconds; on a GitHub
		// runner it has exceeded vitest's 5 s default and failed CI intermittently.
		testTimeout: 30_000,
	},
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
			miniflare: {
				// Bootstrap key, so the auth middleware can be exercised from both
				// sides. Test-only value; production uses a Worker secret.
				bindings: { API_KEY: 'test-key', TEST_MIGRATIONS: migrations },
			},
		}),
	],
});
