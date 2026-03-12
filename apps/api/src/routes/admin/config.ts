import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { KNOWN_CONFIG_KEYS } from '@sdarm/db';
import { upsertConfig } from '../../repositories/config';

const router = new Hono<{ Bindings: Bindings }>();

router.put('/:key', async (c) => {
	const db  = drizzle(c.env.DB);
	const key = c.req.param('key');

	if (!KNOWN_CONFIG_KEYS.includes(key as never)) {
		return c.json({ error: 'Unknown config key' }, 400);
	}

	const { value } = await c.req.json<{ value: string | null }>();
	await upsertConfig(db, key, value);

	return c.json({ ok: true });
});

export default router;
