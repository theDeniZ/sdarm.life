import { baseLayout } from './base';

const i18n = {
	de: {
		eyebrow: 'Willkommen',
		heading: 'Schön, dass Sie dabei sind.',
		intro: 'Sie sind jetzt auf dem Laufenden, was auf sdarm.life passiert. Hier ist, was Sie entdecken können:',
		sections: [
			{
				label: 'Lieder',
				title: 'Liederbücher & Noten',
				desc: 'Durchsuchen Sie unsere Sammlung geistlicher Lieder in verschiedenen Sprachen.',
				href: (base: string) => `${base}/de`,
			},
			{
				label: 'Veranstaltungen',
				title: 'Termine & Treffen',
				desc: 'Bleiben Sie über bevorstehende Gottesdienste und Gemeinschaftstreffen informiert.',
				href: (base: string) => base,
			},
			{
				label: 'Schätze',
				title: 'Bücher & Ressourcen',
				desc: 'Entdecken Sie eine Auswahl an geistlichen Büchern und Materialien zum Herunterladen.',
				href: (base: string) => base,
			},
			{
				label: 'Beiträge',
				title: 'Nachrichten & Andachten',
				desc: 'Lesen Sie aktuelle Beiträge, Predigten und Betrachtungen aus unserer Gemeinde.',
				href: (base: string) => base,
			},
		],
	},
	en: {
		eyebrow: 'Welcome',
		heading: "Glad you're here.",
		intro: "You're now subscribed to updates from sdarm.life. Here's what you can explore:",
		sections: [
			{
				label: 'Songs',
				title: 'Songbooks & Sheet Music',
				desc: 'Browse our collection of spiritual songs and music in multiple languages.',
				href: (base: string) => `${base}/en`,
			},
			{
				label: 'Events',
				title: 'Upcoming Gatherings',
				desc: 'Stay informed about upcoming services, camps, and community meetings.',
				href: (base: string) => base,
			},
			{
				label: 'Treasures',
				title: 'Books & Resources',
				desc: 'Discover a selection of spiritual books and materials available for download.',
				href: (base: string) => base,
			},
			{
				label: 'Posts',
				title: 'News & Devotionals',
				desc: 'Read recent posts, sermons, and reflections from our community.',
				href: (base: string) => base,
			},
		],
	},
};

const SITES = {
	songs: 'https://songs.sdarm.life',
	events: 'https://events.sdarm.life',
	treasures: 'https://treasures.sdarm.life',
	web: 'https://sdarm.life',
};

function sectionRow(label: string, title: string, desc: string, href: string, last: boolean): string {
	return `
    <tr>
      <td style="padding:0 0 ${last ? '0' : '24px'} 0;">
        <p style="font-family:Georgia,serif;font-size:10px;color:#c9a96e;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px 0;">${label}</p>
        <a href="${href}" style="font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:600;color:#d6d0c8;text-decoration:none;display:block;margin-bottom:5px;">${title}</a>
        <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;color:#7a7470;margin:0;line-height:1.6;">${desc}</p>
      </td>
    </tr>
    ${last ? '' : '<tr><td style="padding:0 0 24px 0;"><div style="height:1px;background:#1e1c17;"></div></td></tr>'}`;
}

export function welcomeEmail(opts: { unsubscribeUrl: string; locale?: 'de' | 'en' }): string {
	const locale = opts.locale ?? 'de';
	const t = i18n[locale];

	const hrefs = [
		t.sections[0].href(SITES.songs),
		t.sections[1].href(SITES.events),
		t.sections[2].href(SITES.treasures),
		t.sections[3].href(SITES.web),
	];

	const content = `
    <p style="font-family:Georgia,serif;font-size:11px;color:#c9a96e;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px 0;">${t.eyebrow}</p>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:600;color:#d6d0c8;margin:0 0 16px 0;line-height:1.25;">${t.heading}</h1>
    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;color:#7a7470;margin:0 0 32px 0;line-height:1.65;">${t.intro}</p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${t.sections.map((s, i) => sectionRow(s.label, s.title, s.desc, hrefs[i], i === t.sections.length - 1)).join('')}
    </table>`;

	return baseLayout(content, opts);
}
