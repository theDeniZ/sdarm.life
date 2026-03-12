import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';

export const auth: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
	const id = c.req.header('CF-Access-Client-Id');
	const secret = c.req.header('CF-Access-Client-Secret');
	if (!id || !secret || id !== c.env.CF_CLIENT_ID || secret !== c.env.CF_CLIENT_SECRET) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	await next();
};
