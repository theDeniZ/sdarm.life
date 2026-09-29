import { button, emailDocument, eyebrow, headline, legalFooter, paragraph, row, small, unsubscribeHref, type EmailLocale } from './layout';

// Double opt-in confirmation. Kept minimal on purpose — no marketing, only the
// confirm link (UWG §7, see docs/dsgvo.md).

const i18n = {
	de: {
		subject: 'Anmeldung bei sdarm.life bestätigen',
		eyebrow: 'Anmeldung bestätigen',
		heading: 'Fast *geschafft.*',
		intro:
			'Um Ihre Anmeldung zum Newsletter von sdarm.life abzuschließen, bestätigen Sie bitte Ihre E-Mail-Adresse mit einem Klick auf die folgende Schaltfläche.',
		button: 'Anmeldung bestätigen',
		note: 'Dieser Bestätigungsschritt (Double-Opt-In) stellt sicher, dass niemand ohne Ihre Einwilligung Ihre E-Mail-Adresse für den Newsletter einträgt. Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail bitte einfach — es wird nichts weiter passieren.',
		reason: 'Sie erhalten diese E-Mail, weil Sie sich auf sdarm.life angemeldet haben.',
		unsubscribe: 'Abmelden',
	},
	en: {
		subject: 'Confirm your subscription to sdarm.life',
		eyebrow: 'Confirm your subscription',
		heading: 'Almost *there.*',
		intro: 'To complete your subscription to the sdarm.life newsletter, please confirm your email address by clicking the button below.',
		button: 'Confirm subscription',
		note: 'This confirmation step (Double-Opt-In) ensures that no one can subscribe you without your consent. If you did not sign up, just ignore this email — nothing will happen.',
		reason: "You're receiving this because you subscribed at sdarm.life.",
		unsubscribe: 'Unsubscribe',
	},
} as const;

export function confirmSubject(locale: EmailLocale = 'de'): string {
	return i18n[locale].subject;
}

export function confirmEmail(opts: { confirmUrl: string; token: string; locale?: EmailLocale }): string {
	const locale = opts.locale ?? 'de';
	const t = i18n[locale];
	return emailDocument({
		locale,
		title: t.subject,
		preheader: t.intro,
		body: row(
			`${eyebrow(t.eyebrow)}${headline(t.heading)}${paragraph(t.intro, { lead: true, top: 20 })}${button(t.button, opts.confirmUrl)}${small(t.note, 32)}`,
		),
		footer: legalFooter(locale, {
			reason: t.reason,
			unsubscribeLabel: t.unsubscribe,
			unsubscribeHref: unsubscribeHref(locale, encodeURIComponent(opts.token)),
		}),
	});
}
