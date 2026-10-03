import { applyD1Migrations, env } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDigest, digestLocale, hasDigestContent, type DigestContent } from '../src/services/digest/build';
import { personalise, renderDigestHtml, renderDigestText } from '../src/emails/digest';
import { digestMessages, runScheduledDigest, sendDigestBatch } from '../src/services/digest/run';
import {
	DEFAULT_DIGEST_SETTINGS,
	DIGEST_KV_KEY,
	isDigestDue,
	nextDigestRun,
	readDigestSettings,
	writeDigestSettings,
} from '../src/services/digest/settings';

// Subscriber digest (issue #184). The builder and renderers are pure and are
// tested on fixtures; the scheduled run is tested end to end against a migrated
// test D1 with `fetch` stubbed, so no test can reach the email provider.

const SINCE = new Date('2026-09-20T07:00:00Z');
const UNTIL = new Date('2026-09-27T07:00:00Z'); // a Sunday
const INSIDE = new Date('2026-09-24T12:00:00Z');

function empty(): DigestContent {
	return {
		since: SINCE,
		until: UNTIL,
		posts: { items: [], total: 0 },
		songs: { songbooks: [], songs: [] },
		treasures: { added: { items: [], total: 0 }, updated: { items: [], total: 0 } },
	};
}

function songImport(count: number): DigestContent {
	return {
		...empty(),
		songs: {
			songbooks: [{ id: 3, title: 'Lieder des Glaubens', slug: 'lieder-des-glaubens', language: 'de', createdAt: INSIDE, total: count }],
			songs: Array.from({ length: count }, (_, i) => ({ id: 1000 + i, number: count - i, title: `Lied ${count - i}`, songbookId: 3 })),
		},
	};
}

describe('digest builder', () => {
	it('groups songs by songbook, in songbook order, lowest numbers first', () => {
		const model = buildDigest(
			{
				...empty(),
				songs: {
					songbooks: [
						{ id: 1, title: 'Zions Lieder', slug: 'zion', language: 'de', createdAt: new Date('2025-01-01'), total: 2 },
						{ id: 2, title: 'Hymnal', slug: 'hymnal', language: 'en', createdAt: INSIDE, total: 1 },
					],
					songs: [
						{ id: 11, number: 40, title: 'B', songbookId: 1 },
						{ id: 21, number: 7, title: 'Amazing Grace', songbookId: 2 },
						{ id: 10, number: 12, title: 'A', songbookId: 1 },
					],
				},
			},
			'de',
		);
		const songs = model.sections.find((s) => s.key === 'songs')!;
		expect(songs.groups.map((g) => g.title)).toEqual(['Zions Lieder', 'Hymnal']);
		expect(songs.groups[0].items.map((i) => i.meta)).toEqual(['Nr. 12', 'Nr. 40']);
		expect(songs.groups[0].items[0].href).toBe('https://songs.sdarm.life/de/songbooks/zion/10');
		// Only the songbook created inside the window is flagged as new.
		expect(songs.groups[0].badge).toBeUndefined();
		expect(songs.groups[1].badge).toBe('Neues Liederbuch');
		expect(songs.groups[1].meta).toBe('1 neues Lied');
	});

	it('orders sections posts → songs → treasures and links posts to the site', () => {
		const model = buildDigest(
			{
				...songImport(2),
				posts: { items: [{ title: 'Sabbatschule', slug: 'sabbat schule', excerpt: 'Kurz.', publishedAt: INSIDE }], total: 1 },
				treasures: {
					added: { items: [{ id: 9, title: 'Der große Kampf', author: 'E. G. White', language: 'de' }], total: 1 },
					updated: { items: [], total: 0 },
				},
			},
			'de',
		);
		expect(model.sections.map((s) => s.key)).toEqual(['posts', 'songs', 'treasures']);
		expect(model.sections[0].groups[0].items[0].href).toBe('https://sdarm.life/de/posts/sabbat%20schule');
		expect(model.sections[2].groups[0].items[0]).toMatchObject({
			href: 'https://treasures.sdarm.life/de/books/9',
			meta: 'E. G. White · DE',
		});
		expect(model.subject).toBe('Neu auf sdarm.life: 1 Beitrag, 2 Lieder und 1 Buch');
	});

	it('a 700-song import is one digest with a capped list and "and N more"', () => {
		const content = songImport(700);
		expect(hasDigestContent(content)).toBe(true);

		const model = buildDigest(content, 'en');
		const group = model.sections.find((s) => s.key === 'songs')!.groups[0];
		expect(group.items).toHaveLength(5);
		expect(group.items[0].meta).toBe('No. 1');
		expect(group.more).toBe('and 695 more');
		expect(group.meta).toBe('700 new songs');
		expect(model.subject).toBe('New on sdarm.life: 700 songs');

		// One message per subscriber — not one per song.
		const subs = [
			{ email: 'a@example.test', token: 't-a', language: 'de' },
			{ email: 'b@example.test', token: 't-b', language: 'en' },
		];
		const messages = digestMessages(content, subs);
		expect(messages).toHaveLength(2);
		expect(messages[0].html).toContain('und 695 weitere');
		expect(messages[0].html.match(/songbooks\/lieder-des-glaubens\/\d+/g)).toHaveLength(5);
	});

	it('caps songbooks too and folds the rest into one line', () => {
		const books = Array.from({ length: 6 }, (_, i) => ({
			id: i + 1,
			title: `Buch ${i + 1}`,
			slug: `buch-${i + 1}`,
			language: 'de',
			createdAt: new Date('2025-01-01'),
			total: 10,
		}));
		const songs = buildDigest({ ...empty(), songs: { songbooks: books, songs: [] } }, 'de').sections[0];
		expect(songs.groups).toHaveLength(4);
		expect(songs.more).toBe('und 2 weitere Liederbücher mit 20 neuen Liedern');
	});

	it('nothing new → no digest; edited books alone do not send either', () => {
		expect(hasDigestContent(empty())).toBe(false);
		const editsOnly = {
			...empty(),
			treasures: {
				added: { items: [], total: 0 },
				updated: { items: [{ id: 1, title: 'X', author: null, language: 'de' }], total: 1 },
			},
		};
		expect(hasDigestContent(editsOnly)).toBe(false);
	});

	it('picks the language from the subscriber, defaulting to German', () => {
		expect(digestLocale('en')).toBe('en');
		expect(digestLocale('de')).toBe('de');
		expect(digestLocale('ru')).toBe('de');
		expect(digestLocale(null)).toBe('de');

		const messages = digestMessages(songImport(3), [
			{ email: 'de@example.test', token: 'tok-de', language: 'de' },
			{ email: 'en@example.test', token: 'tok-en', language: 'en' },
			{ email: 'ru@example.test', token: 'tok-ru', language: 'ru' },
		]);
		expect(messages.map((m) => m.subject)).toEqual([
			'Neu auf sdarm.life: 3 Lieder',
			'New on sdarm.life: 3 songs',
			'Neu auf sdarm.life: 3 Lieder',
		]);
		expect(messages[1].html).toContain('lang="en"');
		expect(messages[1].html).toContain('https://songs.sdarm.life/en/songbooks/lieder-des-glaubens');
		expect(messages[1].html).toContain('Legal Notice');
		expect(messages[0].html).toContain('Impressum');
	});

	it('gives every message its own unsubscribe link and one-click headers', () => {
		const [m] = digestMessages(songImport(1), [{ email: 'x@example.test', token: 'tok-1', language: 'en' }]);
		expect(m.html).toContain('https://sdarm.life/en/unsubscribe?token=tok-1');
		expect(m.text).toContain('https://sdarm.life/en/unsubscribe?token=tok-1');
		expect(m.html).not.toContain('__UNSUBSCRIBE_TOKEN__');
		expect(m.headers).toEqual({
			'List-Unsubscribe': '<https://api.sdarm.life/api/v1/unsubscribe?token=tok-1>',
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
		});
	});

	it('carries the Impressum address and escapes content', () => {
		const model = buildDigest(
			{ ...empty(), posts: { items: [{ title: '<script>x</script>', slug: 's', excerpt: null, publishedAt: INSIDE }], total: 1 } },
			'de',
		);
		const html = personalise(renderDigestHtml(model), 't');
		expect(html).not.toContain('<script>x');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('Eisenbahnstr. 6');
		expect(html).toContain('https://sdarm.life/de/impressum');
		expect(renderDigestText(model)).toContain('Impressum: https://sdarm.life/de/impressum');
	});
});

describe('digest schedule', () => {
	const on = { ...DEFAULT_DIGEST_SETTINGS, enabled: true, weekday: 0 };

	it('sends only on the chosen weekday, and not while switched off', () => {
		expect(isDigestDue(on, UNTIL)).toBe(true);
		expect(isDigestDue({ ...on, enabled: false }, UNTIL)).toBe(false);
		expect(isDigestDue(on, new Date('2026-09-28T07:00:00Z'))).toBe(false);
	});

	it('respects the gap since the last send', () => {
		expect(isDigestDue({ ...on, lastSentAt: '2026-09-20T07:00:00Z' }, UNTIL)).toBe(true);
		expect(isDigestDue({ ...on, frequency: 'biweekly', lastSentAt: '2026-09-20T07:00:00Z' }, UNTIL)).toBe(false);
		// Monthly = first chosen weekday of the month: 27 September is the fourth Sunday.
		expect(isDigestDue({ ...on, frequency: 'monthly' }, UNTIL)).toBe(false);
		expect(nextDigestRun({ ...on, frequency: 'monthly' }, UNTIL)?.toISOString()).toBe('2026-10-04T07:00:00.000Z');
	});

	it('reads malformed KV as switched off', async () => {
		await env.KV.put(DIGEST_KV_KEY, '{not json');
		expect((await readDigestSettings(env.KV)).enabled).toBe(false);
		await env.KV.put(DIGEST_KV_KEY, JSON.stringify({ enabled: 'yes', weekday: 9, frequency: 'hourly' }));
		expect(await readDigestSettings(env.KV)).toMatchObject({ enabled: false, weekday: 0, frequency: 'weekly' });
	});
});

describe('scheduled run (migrated test D1, fetch stubbed)', () => {
	const fetchSpy = vi.spyOn(globalThis, 'fetch');
	const sec = (d: Date) => Math.floor(d.getTime() / 1000);

	beforeAll(async () => {
		await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	});

	beforeEach(async () => {
		fetchSpy.mockReset();
		fetchSpy.mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
		await env.DB.batch([
			env.DB.prepare('DELETE FROM songs'),
			env.DB.prepare('DELETE FROM songbooks'),
			env.DB.prepare('DELETE FROM subscribers'),
		]);
		await writeDigestSettings(env.KV, { ...DEFAULT_DIGEST_SETTINGS, enabled: true, weekday: 0, since: SINCE.toISOString() });
	});

	afterEach(() => fetchSpy.mockReset());

	async function seedImport(count: number) {
		await env.DB.prepare(
			"INSERT INTO songbooks (id, title, slug, language, sort_order, created_at, updated_at) VALUES (1, 'Lieder des Glaubens', 'ldg', 'de', 0, ?, ?)",
		)
			.bind(sec(new Date('2025-01-01')), sec(new Date('2025-01-01')))
			.run();
		const insert = env.DB.prepare('INSERT INTO songs (songbook_id, number, title, created_at, updated_at) VALUES (1, ?, ?, ?, ?)');
		await env.DB.batch(Array.from({ length: count }, (_, i) => insert.bind(i + 1, `Lied ${i + 1}`, sec(INSIDE), sec(INSIDE))));
		await env.DB.batch([
			env.DB.prepare("INSERT INTO subscribers (email, token, language, confirmed_at, created_at) VALUES ('de@example.test', 'tok-de', 'de', 1, 1)"),
			env.DB.prepare("INSERT INTO subscribers (email, token, language, confirmed_at, created_at) VALUES ('en@example.test', 'tok-en', 'en', 1, 1)"),
			// Never confirmed (double opt-in pending) — must not receive anything.
			env.DB.prepare("INSERT INTO subscribers (email, token, language, created_at) VALUES ('pending@example.test', 'tok-p', 'de', 1)"),
		]);
	}

	it('is a no-op on a day that is not a send day', async () => {
		await seedImport(3);
		const run = await runScheduledDigest({ ...env, RESEND_API_KEY: 'test' }, new Date('2026-09-28T07:00:00Z'));
		expect(run).toBeNull();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('nothing new → records it, sends nothing, keeps the window', async () => {
		const run = await runScheduledDigest({ ...env, RESEND_API_KEY: 'test' }, UNTIL);
		expect(run?.outcome).toBe('nothing-new');
		expect(fetchSpy).not.toHaveBeenCalled();
		expect((await readDigestSettings(env.KV)).since).toBe(SINCE.toISOString());
	});

	it('without an API key: skips, sends nothing, keeps the window', async () => {
		await seedImport(3);
		const run = await runScheduledDigest({ ...env, RESEND_API_KEY: '' }, UNTIL);
		expect(run?.outcome).toBe('not-configured');
		expect(fetchSpy).not.toHaveBeenCalled();
		expect((await readDigestSettings(env.KV)).since).toBe(SINCE.toISOString());
	});

	it('a 700-song import sends one digest per confirmed subscriber in one batch, then advances', async () => {
		await seedImport(700);
		const run = await runScheduledDigest({ ...env, RESEND_API_KEY: 'test' }, UNTIL);
		expect(run).toMatchObject({ outcome: 'sent', recipients: 2 });

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://api.resend.com/emails/batch');
		expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('digest-2026-09-27-0');
		const batch = JSON.parse(init.body as string) as { to: string; subject: string; html: string }[];
		expect(batch.map((m) => m.to).sort()).toEqual(['de@example.test', 'en@example.test']);
		expect(batch.find((m) => m.to === 'en@example.test')?.subject).toBe('New on sdarm.life: 700 songs');
		expect(batch[0].html).toMatch(/695/);

		const after = await readDigestSettings(env.KV);
		expect(after.since).toBe(UNTIL.toISOString());
		expect(after.lastSentAt).toBe(UNTIL.toISOString());

		// Same day again: already sent, not due.
		expect(await runScheduledDigest({ ...env, RESEND_API_KEY: 'test' }, UNTIL)).toBeNull();
	});

	it('sendDigestBatch without a key never calls fetch', async () => {
		const res = await sendDigestBatch({ RESEND_API_KEY: '' }, [], 'x');
		expect(res.status).toBe('not-configured');
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
