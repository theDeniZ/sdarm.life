import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../../types';
import { ApiKeySchema, ErrorSchema, OkSchema } from '../../schemas';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const KV_INDEX = 'apikeys:index';

interface ApiKeyEntry {
	id: string;
	name: string;
	prefix: string;
	hash: string; // SHA-256 hex of the key — stored internally, never returned in responses
	createdAt: string;
	revokedAt: string | null;
}

async function hashKey(key: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function getIndex(kv: KVNamespace): Promise<ApiKeyEntry[]> {
	const raw = await kv.get(KV_INDEX);
	if (!raw) return [];
	return JSON.parse(raw) as ApiKeyEntry[];
}

// ── List ──────────────────────────────────────────────────────────────────────

const listRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Admin / API Keys'],
	security: [{ bearerAuth: [] }],
	responses: {
		200: {
			content: { 'application/json': { schema: z.array(ApiKeySchema) } },
			description: 'All API keys (active and revoked)',
		},
	},
});

// ── Create ────────────────────────────────────────────────────────────────────

const createKeyRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Admin / API Keys'],
	security: [{ bearerAuth: [] }],
	request: {
		body: {
			content: { 'application/json': { schema: z.object({ name: z.string().min(1) }) } },
		},
	},
	responses: {
		201: {
			content: {
				'application/json': {
					schema: z.object({ key: z.string(), apiKey: ApiKeySchema }),
				},
			},
			description: 'Key created — plaintext shown once, not stored',
		},
	},
});

// ── Revoke ────────────────────────────────────────────────────────────────────

const revokeKeyRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Admin / API Keys'],
	security: [{ bearerAuth: [] }],
	request: { params: z.object({ id: z.string() }) },
	responses: {
		200: {
			content: { 'application/json': { schema: OkSchema } },
			description: 'Key revoked',
		},
		404: {
			content: { 'application/json': { schema: ErrorSchema } },
			description: 'Not found or already revoked',
		},
	},
});

// ── Handlers ──────────────────────────────────────────────────────────────────

router.openapi(listRoute, async (c) => {
	const index = await getIndex(c.env.KV);
	return c.json(
		index.map(({ hash: _h, ...rest }) => rest),
		200,
	);
});

router.openapi(createKeyRoute, async (c) => {
	const { name } = c.req.valid('json');

	// Generate key: sdarm_sk_ + 32 random bytes as base64url (no padding)
	const random = crypto.getRandomValues(new Uint8Array(32));
	const key =
		'sdarm_sk_' +
		btoa(String.fromCharCode(...random))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');

	const prefix = key.slice(0, 16);
	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const hash = await hashKey(key);

	const entry: ApiKeyEntry = { id, name, prefix, hash, createdAt, revokedAt: null };
	const index = await getIndex(c.env.KV);
	index.push(entry);

	await Promise.all([
		c.env.KV.put(`apikey:${hash}`, JSON.stringify({ id, name, prefix })),
		c.env.KV.put(KV_INDEX, JSON.stringify(index)),
	]);

	const { hash: _h, ...apiKey } = entry;
	return c.json({ key, apiKey }, 201);
});

router.openapi(revokeKeyRoute, async (c) => {
	const { id } = c.req.valid('param');
	const index = await getIndex(c.env.KV);
	const idx = index.findIndex((k) => k.id === id && !k.revokedAt);
	if (idx === -1) return c.json({ error: 'Not found' }, 404);

	const entry = index[idx];
	entry.revokedAt = new Date().toISOString();

	await Promise.all([
		c.env.KV.delete(`apikey:${entry.hash}`),
		c.env.KV.put(KV_INDEX, JSON.stringify(index)),
	]);

	return c.json({ ok: true as const }, 200);
});

export default router;
