import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { ErrorSchema, OkSchema } from '../../schemas';
import { findConfirmedSubscriberByEmail, listAllConfirmedSubscribers } from '../../repositories/subscribers';
import { updatesEmail } from '../../emails/updates';
import { composerTemplates, COMPOSER_TEMPLATE_IDS } from '../../emails/templates';
import { personalise, stripSubscription, UNSUBSCRIBE_TOKEN, type EmailLocale } from '../../emails/layout';
import { unsubscribeHeaders } from '../../services/digest/run';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const RESEND_SINGLE = 'https://api.resend.com/emails';
const RESEND_BATCH = 'https://api.resend.com/emails/batch';
const FROM = 'info@sdarm.life';
const BATCH_SIZE = 100;

const NOT_CONFIGURED = 'Sending is not configured: RESEND_API_KEY is not set';

async function resendError(res: Response, fallback: string): Promise<string> {
	try {
		return ((await res.json()) as { message?: string }).message ?? fallback;
	} catch {
		return fallback;
	}
}

const EmailTemplateSchema = z
	.object({
		id: z.enum(COMPOSER_TEMPLATE_IDS),
		label: z.string(),
		description: z.string(),
		audience: z.enum(['subscribers', 'anyone']),
		subject: z.string(),
		html: z.string(),
	})
	.openapi('EmailTemplate');

router.openapi(
	createRoute({
		method: 'get',
		path: '/email/templates',
		tags: ['Admin / Email'],
		security: [{ bearerAuth: [] }],
		request: { query: z.object({ locale: z.enum(['de', 'en']).optional() }) },
		responses: {
			200: {
				content: { 'application/json': { schema: z.object({ items: z.array(EmailTemplateSchema) }) } },
				description: 'Composer starting points, rendered in the shared email layout',
			},
		},
	}),
	(c) => c.json({ items: composerTemplates(c.req.valid('query').locale ?? 'de') }, 200),
);

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
			400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Unsubscribe link for a recipient who is not a subscriber' },
			500: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Send failed' },
			503: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Sending is not configured' },
		},
	}),
	async (c) => {
		const { to, subject } = c.req.valid('json');
		let { html } = c.req.valid('json');
		if (!c.env.RESEND_API_KEY) return c.json({ error: NOT_CONFIGURED }, 503);

		// A subscriber template: fill in this recipient's own unsubscribe link, or —
		// for an address that is not on the list — drop the lines that would claim it is.
		let headers: Record<string, string> | undefined;
		if (html.includes(UNSUBSCRIBE_TOKEN)) {
			const sub = await findConfirmedSubscriberByEmail(drizzle(c.env.DB), to);
			if (sub) {
				html = personalise(html, sub.token);
				headers = unsubscribeHeaders(sub.token);
			} else {
				html = stripSubscription(html);
				if (html.includes(UNSUBSCRIBE_TOKEN)) {
					return c.json({ error: `${to} is not a confirmed subscriber — remove the unsubscribe link or use the personal message template` }, 400);
				}
			}
		}

		const res = await fetch(RESEND_SINGLE, {
			method: 'POST',
			headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ from: FROM, to, subject, html, ...(headers ? { headers } : {}) }),
		});

		if (!res.ok) return c.json({ error: await resendError(res, 'Failed to send email') }, 500);

		return c.json({ ok: true as const }, 200);
	},
);

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
			503: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Sending is not configured' },
		},
	}),
	async (c) => {
		const { subject, posts, locale } = c.req.valid('json');
		if (!c.env.RESEND_API_KEY) return c.json({ error: NOT_CONFIGURED }, 503);
		const db = drizzle(c.env.DB);

		const all = await listAllConfirmedSubscribers(db);
		const targets = locale ? all.filter((s) => s.language === locale) : all;

		if (targets.length === 0) return c.json({ sent: 0 }, 200);

		// Rendered once per language, then personalised per subscriber.
		const items = posts.map((p) => ({ ...p, excerpt: p.excerpt ?? null }));
		const rendered = new Map<EmailLocale, string>();
		const messages = targets.map((sub) => {
			const subLocale: EmailLocale = (locale ?? sub.language) === 'en' ? 'en' : 'de';
			let html = rendered.get(subLocale);
			if (!html) {
				html = updatesEmail(items, { subject, locale: subLocale });
				rendered.set(subLocale, html);
			}
			return { from: FROM, to: sub.email, subject, html: personalise(html, sub.token), headers: unsubscribeHeaders(sub.token) };
		});

		for (let i = 0; i < messages.length; i += BATCH_SIZE) {
			const chunk = messages.slice(i, i + BATCH_SIZE);
			const res = await fetch(RESEND_BATCH, {
				method: 'POST',
				headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
				body: JSON.stringify(chunk),
			});
			if (!res.ok) return c.json({ error: await resendError(res, 'Batch send failed') }, 500);
		}

		return c.json({ sent: targets.length }, 200);
	},
);

export default router;
