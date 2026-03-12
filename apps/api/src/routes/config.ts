import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { getAllConfig } from '../repositories/config';

const router = new Hono<{ Bindings: Bindings }>();

router.get('/', async (c) => {
	const db     = drizzle(c.env.DB);
	const config = await getAllConfig(db);
	return c.json(config);
});

export default router;
