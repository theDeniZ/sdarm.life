import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { DigestPreviewDto, DigestSettingsDto } from '@sdarm/types';
import type { Bindings } from '../../types';
import { ErrorSchema, OkSchema } from '../../schemas';
import { countConfirmedSubscribersByLanguage } from '../../repositories/subscribers';
import { digestLocale, hasDigestContent } from '../../services/digest/build';
import {
	collectDigestContent,
	DIGEST_FROM,
	renderDigest,
	sendDigestOne,
	unsubscribeHeaders,
} from '../../services/digest/run';
import { personalise } from '../../emails/digest';
import {
	DIGEST_FREQUENCIES,
	digestWindowStart,
	nextDigestRun,
	readDigestSettings,
	writeDigestSettings,
	type DigestSettings,
} from '../../services/digest/settings';

// Admin side of the subscriber digest (issue #184): settings, a live preview of
// the next digest, and a test send to one address. The scheduled send itself is
// services/digest/run.ts, called from the Worker's `scheduled` handler.

const router = new OpenAPIHono<{ Bindings: Bindings }>();

/** Token used in previews and test sends — matches no subscriber, so its links unsubscribe nobody. */
const PREVIEW_TOKEN = 'preview';

const FrequencySchema = z.enum(DIGEST_FREQUENCIES);

const DigestRunSchema = z.object({
	at: z.string(),
	outcome: z.enum(['sent', 'nothing-new', 'not-configured', 'failed']),
	recipients: z.number(),
	detail: z.string().nullable(),
});

const DigestSettingsSchema = z
	.object({
		enabled: z.boolean(),
		frequency: FrequencySchema,
		weekday: z.number().int().min(0).max(6),
		since: z.string(),
		lastSentAt: z.string().nullable(),
		lastRun: DigestRunSchema.nullable(),
		nextRun: z.string().nullable(),
		recipients: z.object({ de: z.number(), en: z.number() }),
		sendingConfigured: z.boolean(),
	})
	.openapi('DigestSettings');

const DigestPreviewSchema = z
	.object({
		since: z.string(),
		until: z.string(),
		hasContent: z.boolean(),
		counts: z.object({ posts: z.number(), songs: z.number(), books: z.number(), revisedBooks: z.number() }),
		subject: z.string(),
		html: z.string(),
		text: z.string(),
	})
	.openapi('DigestPreview');

const WindowQuery = z.object({
	locale: z.enum(['de', 'en']).optional(),
	since: z.string().datetime({ offset: true }).optional().openapi({ description: 'Override the window start (ISO). Defaults to where the next digest starts.' }),
});

async function settingsDto(env: Bindings, s: DigestSettings, now: Date): Promise<DigestSettingsDto> {
	const byLanguage = await countConfirmedSubscribersByLanguage(drizzle(env.DB));
	const recipients = { de: 0, en: 0 };
	for (const row of byLanguage) recipients[digestLocale(row.language)] += row.count;
	return {
		enabled: s.enabled,
		frequency: s.frequency,
		weekday: s.weekday,
		since: digestWindowStart(s, now).toISOString(),
		lastSentAt: s.lastSentAt,
		lastRun: s.lastRun,
		nextRun: nextDigestRun(s, now)?.toISOString() ?? null,
		recipients,
		sendingConfigured: Boolean(env.RESEND_API_KEY),
	};
}

async function preview(env: Bindings, locale: 'de' | 'en', sinceParam: string | undefined): Promise<DigestPreviewDto> {
	const now = new Date();
	const since = sinceParam ? new Date(sinceParam) : digestWindowStart(await readDigestSettings(env.KV), now);
	const content = await collectDigestContent(drizzle(env.DB), since, now);
	const r = renderDigest(content, locale);
	return {
		since: since.toISOString(),
		until: now.toISOString(),
		hasContent: hasDigestContent(content),
		counts: {
			posts: content.posts.total,
			songs: content.songs.songbooks.reduce((n, b) => n + b.total, 0),
			books: content.treasures.added.total,
			revisedBooks: content.treasures.updated.total,
		},
		subject: r.subject,
		html: personalise(r.html, PREVIEW_TOKEN),
		text: personalise(r.text, PREVIEW_TOKEN),
	};
}

router.openapi(
	createRoute({
		method: 'get',
		path: '/email/digest',
		tags: ['Admin / Email'],
		security: [{ bearerAuth: [] }],
		responses: {
			200: { content: { 'application/json': { schema: DigestSettingsSchema } }, description: 'Digest settings and last run' },
		},
	}),
	async (c) => c.json(await settingsDto(c.env, await readDigestSettings(c.env.KV), new Date()), 200),
);

router.openapi(
	createRoute({
		method: 'put',
		path: '/email/digest',
		tags: ['Admin / Email'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({ enabled: z.boolean(), frequency: FrequencySchema, weekday: z.number().int().min(0).max(6) }),
					},
				},
				required: true,
			},
		},
		responses: {
			200: { content: { 'application/json': { schema: DigestSettingsSchema } }, description: 'Updated settings' },
		},
	}),
	async (c) => {
		const body = c.req.valid('json');
		const now = new Date();
		const current = await readDigestSettings(c.env.KV);
		const next: DigestSettings = { ...current, ...body };
		// Switching on pins the window, so the first email covers what the preview
		// showed at that moment. A digest paused for months starts one period
		// back rather than from where it stopped.
		if (next.enabled && !current.enabled) {
			const fresh = digestWindowStart({ ...next, since: null }, now);
			if (!next.since || new Date(next.since) < fresh) next.since = fresh.toISOString();
		}
		await writeDigestSettings(c.env.KV, next);
		return c.json(await settingsDto(c.env, next, now), 200);
	},
);

router.openapi(
	createRoute({
		method: 'get',
		path: '/email/digest/preview',
		tags: ['Admin / Email'],
		security: [{ bearerAuth: [] }],
		request: { query: WindowQuery },
		responses: {
			200: { content: { 'application/json': { schema: DigestPreviewSchema } }, description: 'The next digest, rendered' },
		},
	}),
	async (c) => {
		const { locale, since } = c.req.valid('query');
		return c.json(await preview(c.env, locale ?? 'de', since), 200);
	},
);

router.openapi(
	createRoute({
		method: 'post',
		path: '/email/digest/test',
		tags: ['Admin / Email'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({ to: z.string().email() }).extend(WindowQuery.shape),
					},
				},
				required: true,
			},
		},
		responses: {
			200: { content: { 'application/json': { schema: OkSchema } }, description: 'Test digest sent' },
			502: { content: { 'application/json': { schema: ErrorSchema } }, description: 'The email provider rejected it' },
			503: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Sending is not configured' },
		},
	}),
	async (c) => {
		const { to, locale, since } = c.req.valid('json');
		const p = await preview(c.env, locale ?? 'de', since);
		const result = await sendDigestOne(c.env, {
			from: DIGEST_FROM,
			to,
			subject: `[Test] ${p.subject}`,
			html: p.html,
			text: p.text,
			headers: unsubscribeHeaders(PREVIEW_TOKEN),
		});
		if (result.status === 'not-configured') return c.json({ error: 'Sending is not configured: RESEND_API_KEY is not set' }, 503);
		if (result.status === 'failed') return c.json({ error: result.error }, 502);
		return c.json({ ok: true as const }, 200);
	},
);

export default router;
