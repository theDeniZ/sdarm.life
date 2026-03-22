import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';

/** Only accepts the bootstrap env API_KEY — used for api-key management routes. */
export const bootstrapAuth: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
	const header = c.req.header('Authorization');
	const key = header?.startsWith('Bearer ') ? header.slice(7) : null;
	if (key && c.env.API_KEY && key === c.env.API_KEY) {
		await next();
		return;
	}
	return c.json({ error: 'Unauthorized' }, 401);
};

async function hashKey(key: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export const auth: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
	const header = c.req.header('Authorization');
	const key = header?.startsWith('Bearer ') ? header.slice(7) : null;
	if (!key) return c.json({ error: 'Unauthorized' }, 401);

	const hash = await hashKey(key);

	// Check KV-managed keys first
	const kvEntry = await c.env.KV.get(`apikey:${hash}`);
	if (kvEntry) {
		await next();
		return;
	}

	// Fallback: bootstrap env key (plain string compare, same data in-flight over HTTPS)
	if (c.env.API_KEY && key === c.env.API_KEY) {
		await next();
		return;
	}

	return c.json({ error: 'Unauthorized' }, 401);
};
