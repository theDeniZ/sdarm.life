import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { listSubscribers, deleteSubscriber } from '../../repositories/subscribers';

const router = new Hono<{ Bindings: Bindings }>();

router.get('/', async (c) => {
	const db  = drizzle(c.env.DB);
	const { limit: limitQ, offset: offsetQ } = c.req.query();

	const result = await listSubscribers(db, {
		limit:  limitQ  ? parseInt(limitQ,  10) : undefined,
		offset: offsetQ ? parseInt(offsetQ, 10) : 0,
	});

	return c.json(result);
});

router.delete('/:id', async (c) => {
	const db  = drizzle(c.env.DB);
	const id  = parseInt(c.req.param('id'), 10);
	const sub = await deleteSubscriber(db, id);
	if (!sub) return c.json({ error: 'Not found' }, 404);
	return c.json({ ok: true });
});

export default router;
