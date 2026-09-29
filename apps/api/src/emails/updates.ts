import {
	button,
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

// "Notify subscribers" (Admin → Subscribers → POST /admin/email/broadcast):
// the posts the operator picked, one email per subscriber. Rendered once per
// language with UNSUBSCRIBE_TOKEN; the route personalises each copy.

export interface UpdatePost {
	title: string;
	excerpt: string | null;
	href: string;
}

const i18n = {
	de: {
		eyebrow: 'Neuigkeiten',
		heading: 'Es gibt *Neuigkeiten*',
		intro: 'Wir haben neue Beiträge für Sie veröffentlicht. Wir hoffen, sie sind eine Quelle der Ermutigung und des Segens.',
		readMore: 'Weiterlesen',
		cta: 'Alle Beiträge ansehen',
		reason: 'Sie erhalten diese E-Mail, weil Sie sich auf sdarm.life angemeldet haben.',
		unsubscribe: 'Abmelden',
	},
	en: {
		eyebrow: 'Updates',
		heading: "We've got *updates*",
		intro: "We've published new posts for you. We hope they are a source of encouragement and blessing.",
		readMore: 'Read more',
		cta: 'View all posts',
		reason: "You're receiving this because you subscribed at sdarm.life.",
		unsubscribe: 'Unsubscribe',
	},
} as const;

export function updatesEmail(posts: UpdatePost[], opts: { subject: string; locale?: EmailLocale }): string {
	const locale = opts.locale ?? 'de';
	const t = i18n[locale];
	const items = posts
		.map(
			(p, i) =>
				`${divider(i === 0 ? 36 : 28, 24)}${title(p.title, { href: p.href })}${p.excerpt ? paragraph(p.excerpt, { top: 8 }) : ''}${textLink(t.readMore, p.href)}`,
		)
		.join('');
	return emailDocument({
		locale,
		title: opts.subject,
		preheader: posts.map((p) => p.title).join(' · '),
		body: row(
			`${eyebrow(t.eyebrow)}${headline(t.heading)}${paragraph(t.intro, { lead: true, top: 20 })}${items}${button(t.cta, `https://sdarm.life/${locale}`, { top: 40 })}`,
		),
		footer: legalFooter(locale, { reason: t.reason, unsubscribeLabel: t.unsubscribe, unsubscribeHref: unsubscribeHref(locale) }),
	});
}
