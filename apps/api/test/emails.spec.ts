import { applyD1Migrations, env } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookRequestEmail } from '../src/emails/book-request';
import { confirmEmail } from '../src/emails/confirm';
import { welcomeEmail } from '../src/emails/welcome';
import { updatesEmail } from '../src/emails/updates';
import { composerTemplates, COMPOSER_TEMPLATE_IDS, PLACEHOLDER } from '../src/emails/templates';
import { accent, personalise, stripSubscription, SUBSCRIPTION_END, SUBSCRIPTION_START, UNSUBSCRIBE_TOKEN } from '../src/emails/layout';
import emailRouter from '../src/routes/admin/email';

// The shared email design system (emails/layout.ts) and every email rendered
// through it. Nothing here can reach the email provider: the send-route tests
// stub `fetch`, and the default test env has no RESEND_API_KEY.

const LOCALES = ['de', 'en'] as const;
const XSS = '<script>alert(1)</script>';

/** What every email must carry, subscriber or not. */
function expectLegalFooter(html: string, locale: 'de' | 'en') {
	expect(html).toContain(`lang="${locale}"`);
	expect(html).toContain(`https://sdarm.life/${locale}/impressum`);
	expect(html).toContain(`https://sdarm.life/${locale}/datenschutz`);
	expect(html).toContain('Eisenbahnstr. 6, D-65439 Flörsheim/M');
	// Nothing that phones home: no images, no remote stylesheets or fonts.
	expect(html).not.toMatch(/<img|<link|@import|url\(/i);
}

describe('composer templates', () => {
	for (const locale of LOCALES) {
		const templates = composerTemplates(locale);

		it(`renders every template in ${locale}`, () => {
			expect(templates.map((t) => t.id)).toEqual([...COMPOSER_TEMPLATE_IDS]);
			for (const t of templates) {
				expect(t.html.startsWith('<!DOCTYPE html>')).toBe(true);
				expect(t.subject.length).toBeGreaterThan(0);
				expectLegalFooter(t.html, locale);
			}
		});

		it(`gives subscriber templates an unsubscribe line and the personal one none (${locale})`, () => {
			for (const t of templates) {
				if (t.audience === 'subscribers') {
					expect(t.html).toContain(`https://sdarm.life/${locale}/unsubscribe?token=${UNSUBSCRIBE_TOKEN}`);
					expect(t.html).toContain(SUBSCRIPTION_START);
				} else {
					expect(t.html).not.toContain(UNSUBSCRIBE_TOKEN);
					expect(t.html).not.toContain(SUBSCRIPTION_START);
				}
			}
		});

		it(`marks what the operator must fill in (${locale})`, () => {
			for (const t of templates.filter((x) => x.id !== 'sabbath')) {
				expect(t.html.match(PLACEHOLDER)?.length ?? 0).toBeGreaterThan(0);
			}
		});
	}
});

describe('transactional emails', () => {
	for (const locale of LOCALES) {
		it(`confirmation (${locale}): confirm button, personal unsubscribe link, legal footer`, () => {
			const html = confirmEmail({ confirmUrl: `https://sdarm.life/${locale}/confirm?token=abc`, token: 'abc', locale });
			expect(html).toContain(`href="https://sdarm.life/${locale}/confirm?token=abc"`);
			expect(html).toContain('Double-Opt-In');
			expect(html).toContain(`https://sdarm.life/${locale}/unsubscribe?token=abc`);
			expect(html).toContain('v:roundrect'); // Outlook button
			expectLegalFooter(html, locale);
		});

		it(`welcome (${locale}): four areas, personal unsubscribe link, legal footer`, () => {
			const html = welcomeEmail({ token: 'abc', locale });
			for (const host of ['songs.sdarm.life', 'events.sdarm.life', 'treasures.sdarm.life']) expect(html).toContain(host);
			expect(html).toContain(`https://sdarm.life/${locale}/unsubscribe?token=abc`);
			expectLegalFooter(html, locale);
		});

		it(`broadcast (${locale}): escapes the operator's post fields`, () => {
			const html = personalise(
				updatesEmail([{ title: XSS, excerpt: `"quoted" & ${XSS}`, href: 'https://sdarm.life/de/posts/a"onmouseover="x' }], {
					subject: XSS,
					locale,
				}),
				'tok',
			);
			expect(html).not.toContain('<script>');
			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('a"onmouseover');
			expect(html).toContain(`https://sdarm.life/${locale}/unsubscribe?token=tok`);
			expectLegalFooter(html, locale);
		});
	}

	it('book request: every field escaped, all ten rows, no subscription footer', () => {
		const html = bookRequestEmail({
			name: XSS,
			email: 'a@example.test',
			phone: XSS,
			land: 'DE',
			street: XSS,
			plz: XSS,
			city: XSS,
			religion: XSS,
			books: [XSS, 'Der Weg zu Christus'],
			wish: `Zeile 1\n${XSS}`,
		});
		expect(html).not.toContain('<script>');
		expect(html.match(/&lt;script&gt;/g)?.length).toBeGreaterThanOrEqual(8);
		for (const label of ['Name', 'E-Mail', 'Telefon', 'Land', 'Straße', 'PLZ', 'Stadt', 'Hintergrund', 'Bücher', 'Wunsch']) {
			expect(html).toContain(`>${label}</td>`);
		}
		expect(html).not.toContain(SUBSCRIPTION_START);
		expectLegalFooter(html, 'de');
	});
});

describe('layout helpers', () => {
	it('accent() escapes first, then sets *words* in the italic accent', () => {
		expect(accent('Fast *geschafft.*')).toMatch(/Fast <em [^>]+>geschafft\.<\/em>/);
		expect(accent('<b>*x*</b>')).toMatch(/^&lt;b&gt;<em [^>]+>x<\/em>&lt;\/b&gt;$/);
	});

	it('stripSubscription() removes the reason and the unsubscribe link only', () => {
		const html = composerTemplates('de').find((t) => t.id === 'news')!.html;
		const stripped = stripSubscription(html);
		expect(stripped).not.toContain(UNSUBSCRIBE_TOKEN);
		expect(stripped).not.toContain(SUBSCRIPTION_END);
		expect(stripped).toContain('https://sdarm.life/de/impressum');
	});
});

describe('POST /email/send (migrated test D1, fetch stubbed)', () => {
	const fetchSpy = vi.spyOn(globalThis, 'fetch');
	const news = composerTemplates('en').find((t) => t.id === 'news')!;
	const send = (to: string, html: string, key = 'test') =>
		emailRouter.request(
			'/email/send',
			{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject: 'S', html }) },
			{ ...env, RESEND_API_KEY: key },
		);
	const sentBody = () =>
		JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as { html: string; headers?: Record<string, string> };

	beforeAll(async () => {
		await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	});

	beforeEach(async () => {
		fetchSpy.mockReset();
		fetchSpy.mockResolvedValue(new Response(JSON.stringify({ id: 'x' }), { status: 200 }));
		await env.DB.batch([
			env.DB.prepare('DELETE FROM subscribers'),
			env.DB.prepare(
				"INSERT INTO subscribers (email, token, language, confirmed_at, created_at) VALUES ('sub@example.test', 'tok-sub', 'en', 1, 1)",
			),
			env.DB.prepare("INSERT INTO subscribers (email, token, language, created_at) VALUES ('pending@example.test', 'tok-p', 'de', 1)"),
		]);
	});

	afterEach(() => fetchSpy.mockReset());

	it('without an API key: 503, nothing sent', async () => {
		const res = await send('sub@example.test', news.html, '');
		expect(res.status).toBe(503);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("fills a subscriber's own token and adds one-click unsubscribe headers", async () => {
		const res = await send('Sub@Example.test', news.html);
		expect(res.status).toBe(200);
		const body = sentBody();
		expect(body.html).toContain('https://sdarm.life/en/unsubscribe?token=tok-sub');
		expect(body.html).not.toContain(UNSUBSCRIBE_TOKEN);
		expect(body.headers?.['List-Unsubscribe']).toBe('<https://api.sdarm.life/api/v1/unsubscribe?token=tok-sub>');
	});

	it('drops the subscription lines for anyone not confirmed', async () => {
		const res = await send('pending@example.test', news.html);
		expect(res.status).toBe(200);
		const body = sentBody();
		expect(body.html).not.toContain(UNSUBSCRIBE_TOKEN);
		expect(body.html).not.toContain('unsubscribe?token=');
		expect(body.headers).toBeUndefined();
	});

	it('refuses a stray unsubscribe placeholder for a non-subscriber', async () => {
		const res = await send('someone@example.test', `<p><a href="https://sdarm.life/de/unsubscribe?token=${UNSUBSCRIBE_TOKEN}">x</a></p>`);
		expect(res.status).toBe(400);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('sends hand-written HTML untouched', async () => {
		const res = await send('someone@example.test', '<p>Hallo</p>');
		expect(res.status).toBe(200);
		expect(sentBody().html).toBe('<p>Hallo</p>');
	});
});

describe('GET /email/templates', () => {
	it('lists the rendered templates for a language', async () => {
		const res = await emailRouter.request('/email/templates?locale=en', {}, env);
		expect(res.status).toBe(200);
		const { items } = (await res.json()) as { items: { id: string; html: string }[] };
		expect(items.map((t) => t.id)).toEqual([...COMPOSER_TEMPLATE_IDS]);
		expect(items[0].html).toContain('lang="en"');
	});
});
