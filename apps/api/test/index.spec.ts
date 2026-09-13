import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

// Smoke tests for the Worker's wiring — routing, auth gating, CORS and the
// OpenAPI document. Deliberately no D1-backed routes: the test D1 has no
// migrations applied, so anything touching a table would assert nothing about
// this layer. See docs/testing.md.

describe('OpenAPI document', () => {
	it('is served and declares OpenAPI 3.1', async () => {
		const res = await SELF.fetch('https://example.com/api/openapi.json');
		expect(res.status).toBe(200);

		const doc = (await res.json()) as {
			openapi: string;
			paths: Record<string, unknown>;
			components?: { securitySchemes?: Record<string, unknown> };
		};
		expect(doc.openapi).toBe('3.1.0');
		expect(doc.components?.securitySchemes).toHaveProperty('bearerAuth');
	});

	it('registers the documented public routes', async () => {
		const res = await SELF.fetch('https://example.com/api/openapi.json');
		const doc = (await res.json()) as { paths: Record<string, unknown> };

		for (const path of ['/api/v1/posts', '/api/v1/config', '/api/v1/songbooks', '/api/v1/treasures']) {
			expect(Object.keys(doc.paths)).toContain(path);
		}
	});

	it('registers the new Bible routes (self-hosted + YouVersion, issue #183)', async () => {
		const res = await SELF.fetch('https://example.com/api/openapi.json');
		const doc = (await res.json()) as { paths: Record<string, unknown> };
		const paths = Object.keys(doc.paths);

		for (const path of [
			'/api/v1/bible/translations',
			'/api/v1/bible/search',
			'/api/v1/bible/translations/{code}/bundle',
			'/api/v1/admin/bible/translations',
			'/api/v1/admin/bible/translations/{id}',
			'/api/v1/admin/bible/allowlist',
			'/api/v1/admin/bible/takedown',
		]) {
			expect(paths).toContain(path);
		}
	});

	it('serves the Swagger UI', async () => {
		const res = await SELF.fetch('https://example.com/api/ui');
		expect(res.status).toBe(200);
	});
});

describe('admin auth', () => {
	it('rejects an admin request with no Authorization header', async () => {
		const res = await SELF.fetch('https://example.com/api/v1/admin/subscribers');
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: 'Unauthorized' });
	});

	it('rejects an admin request with a wrong bearer key', async () => {
		const res = await SELF.fetch('https://example.com/api/v1/admin/subscribers', {
			headers: { Authorization: 'Bearer not-the-key' },
		});
		expect(res.status).toBe(401);
	});

	it('rejects the api-keys route without the bootstrap key', async () => {
		const res = await SELF.fetch('https://example.com/api/v1/admin/api-keys');
		expect(res.status).toBe(401);
	});

	it('accepts the bootstrap key on the api-keys route', async () => {
		const res = await SELF.fetch('https://example.com/api/v1/admin/api-keys', {
			headers: { Authorization: 'Bearer test-key' },
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});

	// The new Bible admin routes (issue #183) sit behind the same `admin.use('*', auth)`
	// gate as every other admin route — no D1 read happens before auth runs.
	it.each([
		['GET', '/api/v1/admin/bible/translations'],
		['PUT', '/api/v1/admin/bible/allowlist'],
		['POST', '/api/v1/admin/bible/takedown'],
	])('rejects %s %s with no Authorization header', async (method, path) => {
		const res = await SELF.fetch(`https://example.com${path}`, { method });
		expect(res.status).toBe(401);
	});
});

describe('CORS', () => {
	// This list drifted once already (see docs/api.md) — pin the origins that
	// browsers actually depend on.
	it.each([
		'https://sdarm.life',
		'https://admin.sdarm.life',
		'https://songs.sdarm.life',
		'https://events.sdarm.life',
		'https://treasures.sdarm.life',
		'http://localhost:3000',
	])('allows %s', async (origin) => {
		const res = await SELF.fetch('https://example.com/api/openapi.json', { headers: { Origin: origin } });
		expect(res.headers.get('access-control-allow-origin')).toBe(origin);
	});

	it('does not echo an unknown origin', async () => {
		const res = await SELF.fetch('https://example.com/api/openapi.json', {
			headers: { Origin: 'https://evil.example' },
		});
		expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.example');
	});
});

describe('routing', () => {
	it('404s an unknown path', async () => {
		const res = await SELF.fetch('https://example.com/nope');
		expect(res.status).toBe(404);
	});
});
