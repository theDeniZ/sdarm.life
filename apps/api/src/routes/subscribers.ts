import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { createSubscriber, unsubscribeByToken } from '../repositories/subscribers';

const router = new Hono<{ Bindings: Bindings }>();

router.post('/subscribe', async (c) => {
	const db = drizzle(c.env.DB);
	const { email } = await c.req.json<{ email: string }>();

	if (!email || !email.includes('@')) {
		return c.json({ error: 'Invalid email' }, 400);
	}

	try {
		const token = crypto.randomUUID();
		await createSubscriber(db, email.toLowerCase().trim(), token);
	} catch {
		return c.json({ error: 'Already subscribed' }, 409);
	}

	return c.json({ ok: true }, 201);
});

router.get('/unsubscribe', async (c) => {
	const db    = drizzle(c.env.DB);
	const token = c.req.query('token');

	if (!token) return c.json({ error: 'Missing token' }, 400);

	const sub = await unsubscribeByToken(db, token);
	if (!sub) return c.json({ error: 'Invalid token' }, 404);

	return c.json({ ok: true });
});

export default router;
