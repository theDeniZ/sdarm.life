import { baseLayout } from './base';

const i18n = {
	de: {
		eyebrow: 'Anmeldung bestätigen',
		heading: 'Fast geschafft.',
		intro:
			'Um Ihre Anmeldung zum Newsletter von sdarm.life abzuschließen, bestätigen Sie bitte Ihre E-Mail-Adresse mit einem Klick auf die folgende Schaltfläche.',
		button: 'Anmeldung bestätigen',
		note:
			'Dieser Bestätigungsschritt (Double-Opt-In) stellt sicher, dass niemand ohne Ihre Einwilligung Ihre E-Mail-Adresse für den Newsletter einträgt. Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail bitte einfach — es wird nichts weiter passieren.',
	},
	en: {
		eyebrow: 'Confirm your subscription',
		heading: 'Almost there.',
		intro:
			'To complete your subscription to the sdarm.life newsletter, please confirm your email address by clicking the button below.',
		button: 'Confirm subscription',
		note:
			'This confirmation step (Double-Opt-In) ensures that no one can subscribe you without your consent. If you did not sign up, just ignore this email — nothing will happen.',
	},
};

export function confirmEmail(opts: { confirmUrl: string; unsubscribeUrl: string; locale?: 'de' | 'en' }): string {
	const locale = opts.locale ?? 'de';
	const t = i18n[locale];

	const content = `
    <p style="font-family:Georgia,serif;font-size:11px;color:#c9a96e;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px 0;">${t.eyebrow}</p>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:600;color:#d6d0c8;margin:0 0 16px 0;line-height:1.25;">${t.heading}</h1>
    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;color:#b6ada0;margin:0 0 28px 0;line-height:1.65;">${t.intro}</p>

    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px 0;">
      <tr>
        <td style="background:#c9a96e;border-radius:2px;">
          <a href="${opts.confirmUrl}" style="display:inline-block;padding:14px 28px;font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:600;color:#0c0b09;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">${t.button}</a>
        </td>
      </tr>
    </table>

    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;color:#7a7470;margin:0;line-height:1.65;">${t.note}</p>`;

	return baseLayout(content, opts);
}
