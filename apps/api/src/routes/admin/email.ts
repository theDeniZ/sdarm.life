import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { ErrorSchema, OkSchema } from '../../schemas';
import { listAllSubscribers } from '../../repositories/subscribers';
import { updatesEmail } from '../../emails/updates';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const RESEND_BATCH = 'https://api.resend.com/emails/batch';
const FROM = 'info@sdarm.life';
const BATCH_SIZE = 100;

// ── Single send ───────────────────────────────────────────────────────────────

router.openapi(
	createRoute({
		method: 'post',
		path: '/email/send',
		tags: ['Admin / Email'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: { 'application/json': { schema: z.object({ to: z.string().email(), subject: z.string().min(1), html: z.string().min(1) }) } },
				required: true,
			},
		},
		responses: {
			200: { content: { 'application/json': { schema: OkSchema } }, description: 'Email sent' },
			500: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Send failed' },
		},
	}),
	async (c) => {
		const { to, subject, html } = c.req.valid('json');

		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ from: FROM, to, subject, html }),
		});

		if (!res.ok) {
			const err = (await res.json()) as { message?: string };
			return c.json({ error: err.message ?? 'Failed to send email' }, 500);
		}

		return c.json({ ok: true as const }, 200);
	},
);

// ── Broadcast to subscribers ──────────────────────────────────────────────────

const PostItem = z.object({
	title: z.string().min(1),
	excerpt: z.string().nullable().optional(),
	href: z.string().url(),
});

const BroadcastBody = z.object({
	subject: z.string().min(1),
	posts: z.array(PostItem).min(1),
	locale: z.enum(['de', 'en']).optional(), // omit = send to all in their preferred language
});

const BroadcastResult = z.object({ sent: z.number() }).openapi('BroadcastResult');

router.openapi(
	createRoute({
		method: 'post',
		path: '/email/broadcast',
		tags: ['Admin / Email'],
		security: [{ bearerAuth: [] }],
		request: { body: { content: { 'application/json': { schema: BroadcastBody } }, required: true } },
		responses: {
			200: { content: { 'application/json': { schema: BroadcastResult } }, description: 'Broadcast sent' },
			500: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Send failed' },
		},
	}),
	async (c) => {
		const { subject, posts, locale } = c.req.valid('json');
		const db = drizzle(c.env.DB);
		const apiBase = new URL(c.req.url).origin;

		const all = await listAllSubscribers(db);
		const targets = locale ? all.filter((s) => s.language === locale) : all;

		if (targets.length === 0) return c.json({ sent: 0 }, 200);

		const messages = targets.map((sub) => {
			const unsubscribeUrl = `${apiBase}/api/v1/unsubscribe?token=${sub.token}`;
			const subLocale = (locale ?? sub.language ?? 'de') as 'de' | 'en';
			return {
				from: FROM,
				to: sub.email,
				subject,
				html: updatesEmail(posts.map((p) => ({ ...p, excerpt: p.excerpt ?? null })), { unsubscribeUrl, locale: subLocale }),
			};
		});

		// Resend batch API — max 100 per request
		for (let i = 0; i < messages.length; i += BATCH_SIZE) {
			const chunk = messages.slice(i, i + BATCH_SIZE);
			const res = await fetch(RESEND_BATCH, {
				method: 'POST',
				headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
				body: JSON.stringify(chunk),
			});
			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				return c.json({ error: err.message ?? 'Batch send failed' }, 500);
			}
		}

		return c.json({ sent: targets.length }, 200);
	},
);

export default router;
