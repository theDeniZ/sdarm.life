import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

// The pool is a Vite plugin now. The `@cloudflare/vitest-pool-workers/config`
// entrypoint that used to export `defineWorkersConfig` no longer exists — see
// docs/testing.md before "fixing" an import error here by bumping versions.
export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
			miniflare: {
				// Bootstrap key, so the auth middleware can be exercised from both
				// sides. Test-only value; production uses a Worker secret.
				bindings: { API_KEY: 'test-key' },
			},
		}),
	],
});
