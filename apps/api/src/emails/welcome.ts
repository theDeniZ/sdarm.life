import {
	divider,
	emailDocument,
	eyebrow,
	headline,
	legalFooter,
	paragraph,
	row,
	textLink,
	title,
	unsubscribeHref,
	type EmailLocale,
} from './layout';

const SITES = {
	songs: 'https://songs.sdarm.life',
	events: 'https://events.sdarm.life',
	treasures: 'https://treasures.sdarm.life',
	web: 'https://sdarm.life',
};

const i18n = {
	de: {
		subject: 'Willkommen bei sdarm.life',
		eyebrow: 'Willkommen',
		heading: 'Schön, dass Sie *dabei* sind.',
		intro: 'Sie sind jetzt auf dem Laufenden, was auf sdarm.life passiert. Hier ist, was Sie entdecken können:',
		open: 'Öffnen',
		sections: [
			{
				label: 'Lieder',
				title: 'Liederbücher & Noten',
				desc: 'Durchsuchen Sie unsere Sammlung geistlicher Lieder in verschiedenen Sprachen.',
				href: `${SITES.songs}/de`,
			},
			{
				label: 'Veranstaltungen',
				title: 'Termine & Treffen',
				desc: 'Bleiben Sie über bevorstehende Gottesdienste und Gemeinschaftstreffen informiert.',
				href: SITES.events,
			},
			{
				label: 'Schätze',
				title: 'Bücher & Ressourcen',
				desc: 'Entdecken Sie eine Auswahl an geistlichen Büchern und Materialien zum Herunterladen.',
				href: SITES.treasures,
			},
			{
				label: 'Beiträge',
				title: 'Nachrichten & Andachten',
				desc: 'Lesen Sie aktuelle Beiträge, Predigten und Betrachtungen aus unserer Gemeinde.',
				href: SITES.web,
			},
		],
		reason: 'Sie erhalten diese E-Mail, weil Sie sich auf sdarm.life angemeldet haben.',
		unsubscribe: 'Abmelden',
	},
	en: {
		subject: 'Welcome to sdarm.life',
		eyebrow: 'Welcome',
		heading: "Glad you're *here.*",
		intro: "You're now subscribed to updates from sdarm.life. Here's what you can explore:",
		open: 'Open',
		sections: [
			{
				label: 'Songs',
				title: 'Songbooks & Sheet Music',
				desc: 'Browse our collection of spiritual songs and music in multiple languages.',
				href: `${SITES.songs}/en`,
			},
			{
				label: 'Events',
				title: 'Upcoming Gatherings',
				desc: 'Stay informed about upcoming services, camps, and community meetings.',
				href: SITES.events,
			},
			{
				label: 'Treasures',
				title: 'Books & Resources',
				desc: 'Discover a selection of spiritual books and materials available for download.',
				href: SITES.treasures,
			},
			{
				label: 'Posts',
				title: 'News & Devotionals',
				desc: 'Read recent posts, sermons, and reflections from our community.',
				href: SITES.web,
			},
		],
		reason: "You're receiving this because you subscribed at sdarm.life.",
		unsubscribe: 'Unsubscribe',
	},
} as const;

export function welcomeSubject(locale: EmailLocale = 'de'): string {
	return i18n[locale].subject;
}

export function welcomeEmail(opts: { token: string; locale?: EmailLocale }): string {
	const locale = opts.locale ?? 'de';
	const t = i18n[locale];
	const sections = t.sections
		.map(
			(s, i) =>
				`${divider(i === 0 ? 36 : 28, 24)}${eyebrow(s.label, 10)}${title(s.title, { href: s.href })}${paragraph(s.desc, { top: 8 })}${textLink(t.open, s.href)}`,
		)
		.join('');
	return emailDocument({
		locale,
		title: t.subject,
		preheader: t.intro,
		body: row(`${eyebrow(t.eyebrow)}${headline(t.heading)}${paragraph(t.intro, { lead: true, top: 20 })}${sections}`),
		footer: legalFooter(locale, {
			reason: t.reason,
			unsubscribeLabel: t.unsubscribe,
			unsubscribeHref: unsubscribeHref(locale, encodeURIComponent(opts.token)),
		}),
	});
}
