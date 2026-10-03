/**
 * Subscriber digest (issue #184) — collecting the window, rendering it per
 * language, and handing it to Resend. The scheduled entry point is
 * `runScheduledDigest`, called from the Worker's `scheduled` handler.
 *
 * Fail-safe by construction: with no `RESEND_API_KEY` (every local and test
 * environment) nothing leaves the Worker — the run is logged, recorded as
 * `not-configured`, and the window is left where it was.
 */
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import type { DigestRunDto } from '@sdarm/types';
import type { Bindings } from '../../types';
import { listPostsPublishedBetween } from '../../repositories/posts';
import { listSongsCreatedBetween } from '../../repositories/songs';
import { listTreasuresChangedBetween } from '../../repositories/treasures';
import { listAllConfirmedSubscribers } from '../../repositories/subscribers';
import { personalise, renderDigestHtml, renderDigestText } from '../../emails/digest';
import { buildDigest, DIGEST_LIMITS, digestLocale, hasDigestContent, type DigestContent, type DigestLocale } from './build';
import { digestWindowStart, isDigestDue, readDigestSettings, writeDigestSettings } from './settings';

export const DIGEST_FROM = 'SDARM.life <info@sdarm.life>';
/** Where the RFC 8058 one-click POST goes. Production host: the cron has no request to take an origin from. */
export const DIGEST_API_ORIGIN = 'https://api.sdarm.life';

const RESEND_BATCH = 'https://api.resend.com/emails/batch';
const RESEND_SINGLE = 'https://api.resend.com/emails';
const BATCH_SIZE = 100; // Resend batch API maximum

export async function collectDigestContent(db: DrizzleD1Database & { $client: D1Database }, since: Date, until: Date): Promise<DigestContent> {
	const [posts, songs, treasures] = await Promise.all([
		listPostsPublishedBetween(db, since, until, DIGEST_LIMITS.posts),
		listSongsCreatedBetween(db, since, until, DIGEST_LIMITS.songsPerSongbook),
		listTreasuresChangedBetween(db, since, until, DIGEST_LIMITS.treasures),
	]);
	return { since, until, posts, songs, treasures };
}

export interface DigestRendering {
	subject: string;
	html: string;
	text: string;
}

export function renderDigest(content: DigestContent, locale: DigestLocale): DigestRendering {
	const model = buildDigest(content, locale);
	return { subject: model.subject, html: renderDigestHtml(model), text: renderDigestText(model) };
}

export interface DigestMessage {
	from: string;
	to: string;
	subject: string;
	html: string;
	text: string;
	headers: Record<string, string>;
}

/** One message per subscriber, each in its own language, rendered once per language. */
export function digestMessages(
	content: DigestContent,
	subscribers: { email: string; token: string; language: string }[],
): DigestMessage[] {
	const cache = new Map<DigestLocale, DigestRendering>();
	return subscribers.map((sub) => {
		const locale = digestLocale(sub.language);
		let r = cache.get(locale);
		if (!r) {
			r = renderDigest(content, locale);
			cache.set(locale, r);
		}
		return {
			from: DIGEST_FROM,
			to: sub.email,
			subject: r.subject,
			html: personalise(r.html, sub.token),
			text: personalise(r.text, sub.token),
			headers: unsubscribeHeaders(sub.token),
		};
	});
}

/** RFC 2369 + RFC 8058: the mail client's own "Unsubscribe" button, one click, no page visit. */
export function unsubscribeHeaders(token: string): Record<string, string> {
	return {
		'List-Unsubscribe': `<${DIGEST_API_ORIGIN}/api/v1/unsubscribe?token=${encodeURIComponent(token)}>`,
		'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
	};
}

export type SendResult =
	| { status: 'not-configured' }
	| { status: 'sent'; sent: number }
	| { status: 'failed'; sent: number; error: string };

/** Sends in chunks of 100. Stops at the first failed chunk; `sent` counts what went out before it. */
export async function sendDigestBatch(env: Pick<Bindings, 'RESEND_API_KEY'>, messages: DigestMessage[], runId: string): Promise<SendResult> {
	if (!env.RESEND_API_KEY) {
		console.warn(`[digest] RESEND_API_KEY is not set — skipped ${messages.length} message(s)`);
		return { status: 'not-configured' };
	}
	let sent = 0;
	for (let i = 0; i < messages.length; i += BATCH_SIZE) {
		const chunk = messages.slice(i, i + BATCH_SIZE);
		const res = await fetch(RESEND_BATCH, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json',
				// A re-run of the same chunk within 24 h is dropped by Resend, not delivered twice.
				'Idempotency-Key': `digest-${runId}-${i / BATCH_SIZE}`,
			},
			body: JSON.stringify(chunk),
		});
		if (!res.ok) return { status: 'failed', sent, error: await resendError(res) };
		sent += chunk.length;
	}
	return { status: 'sent', sent };
}

export async function sendDigestOne(env: Pick<Bindings, 'RESEND_API_KEY'>, message: DigestMessage): Promise<SendResult> {
	if (!env.RESEND_API_KEY) {
		console.warn('[digest] RESEND_API_KEY is not set — test message skipped');
		return { status: 'not-configured' };
	}
	const res = await fetch(RESEND_SINGLE, {
		method: 'POST',
		headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(message),
	});
	return res.ok ? { status: 'sent', sent: 1 } : { status: 'failed', sent: 0, error: await resendError(res) };
}

async function resendError(res: Response): Promise<string> {
	try {
		const body = (await res.json()) as { message?: string };
		return body.message ?? `HTTP ${res.status}`;
	} catch {
		return `HTTP ${res.status}`;
	}
}

/**
 * The cron entry point. Sends at most one digest per due day, and only when
 * the window holds something new. Returns the recorded run, or null when today
 * is not a send day (nothing is written then, so the daily trigger costs no KV
 * writes on the other days).
 */
export async function runScheduledDigest(env: Bindings, now: Date): Promise<DigestRunDto | null> {
	const settings = await readDigestSettings(env.KV);
	if (!isDigestDue(settings, now)) return null;

	const record = async (run: Omit<DigestRunDto, 'at'>, advance: boolean): Promise<DigestRunDto> => {
		const lastRun: DigestRunDto = { at: now.toISOString(), ...run };
		await writeDigestSettings(env.KV, {
			...settings,
			...(advance ? { since: now.toISOString(), lastSentAt: now.toISOString() } : {}),
			lastRun,
		});
		console.log(`[digest] ${lastRun.outcome}: ${lastRun.recipients} recipient(s)${lastRun.detail ? ` — ${lastRun.detail}` : ''}`);
		return lastRun;
	};

	try {
		const db = drizzle(env.DB);
		const content = await collectDigestContent(db, digestWindowStart(settings, now), now);
		if (!hasDigestContent(content)) return await record({ outcome: 'nothing-new', recipients: 0, detail: null }, false);

		// Checked before the subscriber list is even read.
		if (!env.RESEND_API_KEY) {
			return await record({ outcome: 'not-configured', recipients: 0, detail: 'RESEND_API_KEY is not set' }, false);
		}

		const subscribers = await listAllConfirmedSubscribers(db);
		const result = await sendDigestBatch(env, digestMessages(content, subscribers), now.toISOString().slice(0, 10));
		if (result.status === 'not-configured') {
			return await record({ outcome: 'not-configured', recipients: 0, detail: 'RESEND_API_KEY is not set' }, false);
		}
		if (result.status === 'failed') {
			// Advance past a partial send anyway: repeating it would mail the first chunks twice.
			return await record({ outcome: 'failed', recipients: result.sent, detail: result.error }, result.sent > 0);
		}
		return await record({ outcome: 'sent', recipients: result.sent, detail: null }, true);
	} catch (err) {
		return record({ outcome: 'failed', recipients: 0, detail: String(err) }, false);
	}
}
