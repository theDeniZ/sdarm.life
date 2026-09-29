import {
	button,
	details,
	divider,
	emailDocument,
	eyebrow,
	headline,
	legalFooter,
	paragraph,
	quote,
	row,
	signoff,
	small,
	textLink,
	title,
	unsubscribeHref,
	type EmailFooter,
	type EmailLocale,
} from './layout';

// Starting points for Admin → Email. The operator loads one into the composer,
// replaces every [[placeholder]] and sends it to one address. They are rendered
// here, through the same layout as every automatic email, and served by
// GET /admin/email/templates — the admin app has no copy of the markup.
//
// Subscriber templates carry UNSUBSCRIBE_TOKEN in the footer link. The send
// route fills in the recipient's own token when the address is a confirmed
// subscriber, and removes the subscription lines when it is not.

export const COMPOSER_TEMPLATE_IDS = ['news', 'event', 'release', 'sabbath', 'personal'] as const;
export type ComposerTemplateId = (typeof COMPOSER_TEMPLATE_IDS)[number];

export interface ComposerTemplate {
	id: ComposerTemplateId;
	/** Admin UI label (English, like the rest of the admin). */
	label: string;
	/** One line for the admin: what it is for. */
	description: string;
	/** `subscribers` = has the unsubscribe footer. */
	audience: 'subscribers' | 'anyone';
	subject: string;
	html: string;
}

/** Marks text the operator must replace. The admin refuses to send while any are left. */
export const PLACEHOLDER = /\[\[[^\]]+\]\]/g;

const META: Record<ComposerTemplateId, { label: string; description: string; audience: ComposerTemplate['audience'] }> = {
	news: { label: 'News update', description: 'Two short news items with links, for subscribers.', audience: 'subscribers' },
	event: {
		label: 'Invitation — service or event',
		description: 'Date, time and place in a table, for subscribers.',
		audience: 'subscribers',
	},
	release: { label: 'New song or book', description: 'One new song or book with an excerpt, for subscribers.', audience: 'subscribers' },
	sabbath: {
		label: 'Sabbath greeting',
		description: 'A verse, a short thought and the lesson link, for subscribers.',
		audience: 'subscribers',
	},
	personal: { label: 'Personal message', description: 'Plain letter to one person. No newsletter footer.', audience: 'anyone' },
};

const i18n = {
	de: {
		reason: 'Sie erhalten diese E-Mail, weil Sie sich auf sdarm.life angemeldet haben.',
		unsubscribe: 'Abmelden',
		regards: 'Herzliche Grüße',
		name: '[[Ihr Name]]',
		news: {
			subject: 'Neues aus der Gemeinde: [[Thema]]',
			eyebrow: 'Neuigkeiten',
			heading: 'Was es *Neues* gibt',
			intro: '[[Ein, zwei Sätze zur Einleitung: was diesmal los war.]]',
			items: [
				{ title: '[[Titel der ersten Meldung]]', text: '[[Zwei, drei Sätze zur Meldung.]]', href: '[[Link zum Beitrag]]' },
				{ title: '[[Titel der zweiten Meldung]]', text: '[[Zwei, drei Sätze zur Meldung.]]', href: '[[Link zum Beitrag]]' },
			],
			readMore: 'Weiterlesen',
			cta: 'Alle Beiträge',
		},
		event: {
			subject: 'Einladung: [[Titel der Veranstaltung]]',
			eyebrow: 'Einladung',
			heading: 'Sie sind *herzlich eingeladen*',
			intro: '[[Ein, zwei Sätze: worum es geht und für wen.]]',
			title: '[[Titel der Veranstaltung]]',
			rows: [
				['Datum', '[[Samstag, 10. Oktober 2026]]'],
				['Uhrzeit', '[[10:00 Uhr]]'],
				['Ort', '[[Gemeindesaal, Straße, PLZ Ort]]'],
			] as [string, string][],
			body: '[[Ablauf, was mitzubringen ist, an wen man sich mit Fragen wendet.]]',
			cta: 'Mehr erfahren',
			closing: 'Wir freuen uns auf Sie.',
		},
		release: {
			subject: 'Neu auf sdarm.life: [[Titel]]',
			eyebrow: 'Neu erschienen',
			heading: 'Neu in der *Sammlung*',
			title: '[[Titel des Liedes oder Buches]]',
			meta: '[[Liederbuch und Nummer — oder Autor und Sprache]]',
			quote: '[[Die ersten Zeilen des Liedes oder ein Satz aus dem Buch]]',
			reference: '[[Quelle]]',
			body: '[[Zwei, drei Sätze: warum es sich lohnt.]]',
			cta: 'Jetzt ansehen',
			href: '[[Link zum Lied oder Buch]]',
			more: 'Alle Liederbücher',
			moreHref: 'https://songs.sdarm.life/de',
		},
		sabbath: {
			subject: 'Einen gesegneten Sabbat',
			eyebrow: 'Sabbatgruß',
			heading: 'Einen gesegneten *Sabbat*',
			verse: 'Gedenke des Sabbattags, daß Du ihn heiligest.',
			reference: '2. Mose 20,8',
			body: '[[Ein kurzer Gedanke zum Vers, zwei bis vier Sätze.]]',
			sunset: 'Sabbatbeginn in [[Ort]]: [[18:45 Uhr]]',
			cta: 'Lektion der Woche',
		},
		personal: {
			subject: '[[Betreff]]',
			greeting: 'Liebe/r [[Name]],',
			body: ['[[Ihre Nachricht.]]', '[[Ein zweiter Absatz, falls nötig — sonst löschen.]]'],
		},
	},
	en: {
		reason: "You're receiving this because you subscribed at sdarm.life.",
		unsubscribe: 'Unsubscribe',
		regards: 'Kind regards',
		name: '[[Your name]]',
		news: {
			subject: 'News from the church: [[Topic]]',
			eyebrow: 'News',
			heading: "What's *new*",
			intro: '[[One or two sentences of introduction: what has been happening.]]',
			items: [
				{ title: '[[Title of the first item]]', text: '[[Two or three sentences about it.]]', href: '[[Link to the post]]' },
				{ title: '[[Title of the second item]]', text: '[[Two or three sentences about it.]]', href: '[[Link to the post]]' },
			],
			readMore: 'Read more',
			cta: 'All posts',
		},
		event: {
			subject: 'Invitation: [[Event title]]',
			eyebrow: 'Invitation',
			heading: 'You are *warmly invited*',
			intro: '[[One or two sentences: what it is about and who it is for.]]',
			title: '[[Event title]]',
			rows: [
				['Date', '[[Saturday, 10 October 2026]]'],
				['Time', '[[10:00 am]]'],
				['Place', '[[Church hall, street, postcode town]]'],
			] as [string, string][],
			body: '[[The programme, what to bring, whom to ask.]]',
			cta: 'Find out more',
			closing: 'We look forward to seeing you.',
		},
		release: {
			subject: 'New on sdarm.life: [[Title]]',
			eyebrow: 'Just released',
			heading: 'New in the *collection*',
			title: '[[Title of the song or book]]',
			meta: '[[Songbook and number — or author and language]]',
			quote: '[[The first lines of the song, or a sentence from the book]]',
			reference: '[[Source]]',
			body: '[[Two or three sentences: why it is worth a look.]]',
			cta: 'Take a look',
			href: '[[Link to the song or book]]',
			more: 'All songbooks',
			moreHref: 'https://songs.sdarm.life/en',
		},
		sabbath: {
			subject: 'A blessed Sabbath',
			eyebrow: 'Sabbath greeting',
			heading: 'A blessed *Sabbath*',
			verse: 'Remember the sabbath day, to keep it holy.',
			reference: 'Exodus 20:8',
			body: '[[A short thought on the verse, two to four sentences.]]',
			sunset: 'Sabbath begins in [[Town]] at [[6:45 pm]]',
			cta: 'This week’s lesson',
		},
		personal: {
			subject: '[[Subject]]',
			greeting: 'Dear [[Name]],',
			body: ['[[Your message.]]', '[[A second paragraph if needed — otherwise delete it.]]'],
		},
	},
} as const;

function render(id: ComposerTemplateId, locale: EmailLocale): { subject: string; html: string } {
	const t = i18n[locale];
	const web = `https://sdarm.life/${locale}`;
	const subscriberFooter: EmailFooter = legalFooter(locale, {
		reason: t.reason,
		unsubscribeLabel: t.unsubscribe,
		unsubscribeHref: unsubscribeHref(locale),
	});
	const lead = (text: string) => paragraph(text, { lead: true, top: 20 });
	const doc = (subject: string, body: string, footer = subscriberFooter) => ({
		subject,
		html: emailDocument({ locale, title: subject, body: row(body), footer }),
	});

	switch (id) {
		case 'news': {
			const s = t.news;
			const items = s.items
				.map(
					(it, i) =>
						`${divider(i === 0 ? 36 : 28, 24)}${title(it.title, { href: it.href })}${paragraph(it.text, { top: 8 })}${textLink(s.readMore, it.href)}`,
				)
				.join('');
			return doc(s.subject, `${eyebrow(s.eyebrow)}${headline(s.heading)}${lead(s.intro)}${items}${button(s.cta, web, { top: 40 })}`);
		}
		case 'event': {
			const s = t.event;
			return doc(
				s.subject,
				`${eyebrow(s.eyebrow)}${headline(s.heading)}${lead(s.intro)}${title(s.title, { top: 36 })}${details(s.rows, 20)}${paragraph(s.body, { top: 24 })}${button(
					s.cta,
					'https://events.sdarm.life',
				)}${signoff([s.closing, t.regards, t.name], 40)}`,
			);
		}
		case 'release': {
			const s = t.release;
			return doc(
				s.subject,
				`${eyebrow(s.eyebrow)}${headline(s.heading)}${title(s.title, { href: s.href, top: 32 })}${small(s.meta, 6)}${quote(s.quote, s.reference)}${paragraph(
					s.body,
					{ top: 28 },
				)}${button(s.cta, s.href)}${textLink(s.more, s.moreHref, 24)}`,
			);
		}
		case 'sabbath': {
			const s = t.sabbath;
			return doc(
				s.subject,
				`${eyebrow(s.eyebrow)}${headline(s.heading)}${quote(s.verse, s.reference, 32)}${paragraph(s.body, { top: 28 })}${small(s.sunset, 20)}${button(
					s.cta,
					'https://sbl.sdarm.life',
					{ variant: 'secondary' },
				)}${signoff([t.regards, t.name], 40)}`,
			);
		}
		case 'personal': {
			const s = t.personal;
			return doc(
				s.subject,
				`${paragraph(s.greeting, { lead: true, top: 0 })}${s.body.map((p) => paragraph(p, { lead: true, top: 18 })).join('')}${signoff([t.regards, t.name])}`,
				legalFooter(locale),
			);
		}
	}
}

export function composerTemplates(locale: EmailLocale): ComposerTemplate[] {
	return COMPOSER_TEMPLATE_IDS.map((id) => ({ id, ...META[id], ...render(id, locale) }));
}
