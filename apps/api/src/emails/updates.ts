import { baseLayout } from './base';

export interface UpdatePost {
	title: string;
	excerpt: string | null;
	href: string;
}

const i18n = {
	de: {
		eyebrow: 'Neuigkeiten',
		heading: 'Es gibt Neuigkeiten',
		intro: 'Wir haben neue Beiträge für Sie veröffentlicht. Wir hoffen, sie sind eine Quelle der Ermutigung und des Segens.',
		readMore: 'Weiterlesen →',
		cta: 'Alle Beiträge ansehen',
		ctaHref: 'https://sdarm.life',
	},
	en: {
		eyebrow: 'Updates',
		heading: "We've got updates",
		intro: "We've published new posts for you. We hope they are a source of encouragement and blessing.",
		readMore: 'Read more →',
		cta: 'View all posts',
		ctaHref: 'https://sdarm.life',
	},
};

export function updatesEmail(
	posts: UpdatePost[],
	opts: { unsubscribeUrl: string; locale?: 'de' | 'en' },
): string {
	const locale = opts.locale ?? 'de';
	const t = i18n[locale];

	const postRows = posts
		.map(
			(p) => `
      <tr>
        <td style="padding:0 0 28px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="border-left:2px solid #c9a96e;padding-left:18px;">
                <a href="${p.href}" style="font-family:'Playfair Display',Georgia,serif;font-size:19px;font-weight:600;color:#d6d0c8;text-decoration:none;line-height:1.3;display:block;margin-bottom:8px;">${p.title}</a>
                ${p.excerpt ? `<p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#7a7470;margin:0 0 10px;line-height:1.65;">${p.excerpt}</p>` : ''}
                <a href="${p.href}" style="font-family:Georgia,serif;font-size:11px;color:#c9a96e;text-decoration:none;text-transform:uppercase;letter-spacing:1.5px;">${t.readMore}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
		)
		.join('');

	const content = `
    <p style="font-family:Georgia,serif;font-size:11px;color:#c9a96e;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px 0;">${t.eyebrow}</p>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:600;color:#d6d0c8;margin:0 0 18px 0;line-height:1.2;">${t.heading}</h1>
    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;color:#7a7470;margin:0 0 36px 0;line-height:1.65;">${t.intro}</p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
      ${postRows}
    </table>

    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:#c9a96e;border-radius:2px;">
          <a href="${t.ctaHref}" style="font-family:Georgia,serif;font-size:11px;font-weight:600;color:#0c0b09;text-decoration:none;text-transform:uppercase;letter-spacing:2px;padding:13px 26px;display:block;">${t.cta}</a>
        </td>
      </tr>
    </table>`;

	return baseLayout(content, opts);
}
