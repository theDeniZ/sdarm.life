/**
 * Digest settings and state (issue #184), one JSON document in KV under
 * `email_digest` — beside the site `config` key, not inside it: the public
 * `GET /api/v1/config` returns the whole `config` object, and none of this is
 * site content. No D1 table on purpose; it is a handful of scalars written a
 * few times a week at most.
 *
 * Schedule model: the Worker's Cron Trigger fires DAILY at `DIGEST_CRON_HOUR_UTC`
 * (`triggers.crons` in wrangler.jsonc), and this module decides whether today
 * is a send day. That keeps the schedule editable from the admin — a cron
 * expression can only change with a deploy.
 */
import type { DigestFrequency, DigestRunDto } from '@sdarm/types';

export const DIGEST_KV_KEY = 'email_digest';

/** Must match `triggers.crons` in apps/api/wrangler.jsonc ("0 7 * * *"). */
export const DIGEST_CRON_HOUR_UTC = 7;

export interface DigestSettings {
	/** Master switch. Off until the owner turns it on in Admin → Email. */
	enabled: boolean;
	frequency: DigestFrequency;
	/** 0 = Sunday … 6 = Saturday, UTC (the cron hour is the same calendar day in Germany). */
	weekday: number;
	/** Content newer than this goes into the next digest. Advanced only by a send that reached someone. */
	since: string | null;
	lastSentAt: string | null;
	lastRun: DigestRunDto | null;
}

export const DEFAULT_DIGEST_SETTINGS: DigestSettings = {
	enabled: false,
	frequency: 'weekly',
	weekday: 0,
	since: null,
	lastSentAt: null,
	lastRun: null,
};

const DAY = 86_400_000;

/** Length of the first window, when no digest has gone out yet. */
const PERIOD_DAYS: Record<DigestFrequency, number> = { weekly: 7, biweekly: 14, monthly: 31 };

/**
 * Minimum gap since the last send. A day short of the period, so a cron that
 * fires a few minutes late one week does not skip a whole cycle.
 */
const MIN_GAP_DAYS: Record<DigestFrequency, number> = { weekly: 6, biweekly: 13, monthly: 7 };

export const DIGEST_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const satisfies readonly DigestFrequency[];

/** Reads the settings, merging onto the defaults. Malformed KV never throws — it reads as "off". */
export async function readDigestSettings(kv: KVNamespace): Promise<DigestSettings> {
	let stored: Partial<DigestSettings> | null = null;
	try {
		stored = await kv.get<Partial<DigestSettings>>(DIGEST_KV_KEY, 'json');
	} catch {
		stored = null;
	}
	const s = { ...DEFAULT_DIGEST_SETTINGS, ...(stored ?? {}) };
	return {
		enabled: s.enabled === true,
		frequency: DIGEST_FREQUENCIES.includes(s.frequency) ? s.frequency : 'weekly',
		weekday: Number.isInteger(s.weekday) && s.weekday >= 0 && s.weekday <= 6 ? s.weekday : 0,
		since: typeof s.since === 'string' ? s.since : null,
		lastSentAt: typeof s.lastSentAt === 'string' ? s.lastSentAt : null,
		lastRun: s.lastRun ?? null,
	};
}

export async function writeDigestSettings(kv: KVNamespace, s: DigestSettings): Promise<void> {
	await kv.put(DIGEST_KV_KEY, JSON.stringify(s));
}

/** Start of the window the next digest covers. */
export function digestWindowStart(s: DigestSettings, now: Date): Date {
	return s.since ? new Date(s.since) : new Date(now.getTime() - PERIOD_DAYS[s.frequency] * DAY);
}

/** Whether a cron run at `now` should send. Monthly = the first chosen weekday of the month. */
export function isDigestDue(s: DigestSettings, now: Date): boolean {
	if (!s.enabled) return false;
	if (now.getUTCDay() !== s.weekday) return false;
	if (s.frequency === 'monthly' && now.getUTCDate() > 7) return false;
	if (!s.lastSentAt) return true;
	return now.getTime() - new Date(s.lastSentAt).getTime() >= MIN_GAP_DAYS[s.frequency] * DAY;
}

/** The next cron run that would send, for the admin panel. Null while switched off. */
export function nextDigestRun(s: DigestSettings, now: Date): Date | null {
	if (!s.enabled) return null;
	for (let d = 0; d <= 62; d++) {
		const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d, DIGEST_CRON_HOUR_UTC));
		if (at > now && isDigestDue(s, at)) return at;
	}
	return null;
}
