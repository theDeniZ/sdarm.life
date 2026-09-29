/**
 * HTML and plain-text renderings of the subscriber digest (issue #184), on the
 * shared email design system in ./layout.ts — see there for the client
 * constraints behind the table layout and the inline styles.
 */
import type { DigestGroup, DigestItem, DigestModel, DigestSection } from '../services/digest/build';
import {
	button,
	C,
	emailDocument,
	esc,
	eyebrow,
	headline,
	note,
	paragraph,
	row,
	SANS,
	sectionLabel,
	SERIF,
	textLink,
	title,
} from './layout';

export { personalise } from './layout';

/** A post: serif title, excerpt, "read more". */
function articleItem(item: DigestItem, readMore: string | undefined, first: boolean): string {
	return `${title(item.title, { href: item.href, size: 21, top: first ? 22 : 28 })}${item.excerpt ? paragraph(item.excerpt, { top: 8 }) : ''}${
		readMore ? textLink(readMore, item.href, 10) : ''
	}`;
}

/** Songs: the number in a narrow column beside the title. Books: title with author/language below. */
function listItems(items: DigestItem[], numbered: boolean): string {
	const link = (i: DigestItem) =>
		`<a class="e-text" href="${esc(i.href)}" style="font-family:${SERIF};font-size:17px;line-height:24px;color:${C.text};text-decoration:none;">${esc(i.title)}</a>`;
	const meta = (m: string) =>
		`<span class="e-muted" style="font-family:${SANS};font-size:13px;line-height:22px;color:${C.muted};">${esc(m)}</span>`;
	const rows = items
		.map((i) =>
			numbered
				? `<tr>
  <td width="64" valign="top" style="width:64px;padding:9px 0 0;white-space:nowrap;">${i.meta ? meta(i.meta) : ''}</td>
  <td valign="top" style="padding:8px 0 0;">${link(i)}</td>
</tr>`
				: `<tr><td colspan="2" style="padding:10px 0 0;">${link(i)}${i.meta ? `<br>${meta(i.meta)}` : ''}</td></tr>`,
		)
		.join('');
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

function group(section: DigestSection, g: DigestGroup, first: boolean, readMore: string | undefined): string {
	let heading = '';
	if (g.title) {
		const top = first ? 22 : 32;
		const badge = g.badge
			? `&nbsp; <span class="e-gold e-rule" style="display:inline-block;padding:2px 10px;border:1px solid ${C.rule};border-radius:999px;font-family:${SANS};font-size:10px;line-height:16px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${C.gold};vertical-align:middle;">${esc(g.badge)}</span>`
			: '';
		heading = g.href
			? `<p style="margin:${top}px 0 0;"><a class="e-strong" href="${esc(g.href)}" style="font-family:${SERIF};font-size:20px;line-height:26px;color:${C.strong};text-decoration:none;">${esc(g.title)}</a>${badge}</p>`
			: `<p class="e-muted" style="margin:${top}px 0 0;font-family:${SANS};font-size:11px;line-height:16px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">${esc(g.title)}${badge}</p>`;
		if (g.meta)
			heading += `<p class="e-muted" style="margin:4px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};">${esc(g.meta)}</p>`;
	}
	const items =
		section.key === 'posts'
			? g.items.map((i, n) => articleItem(i, readMore, n === 0 && !g.title)).join('')
			: listItems(g.items, section.key === 'songs');
	const tail = `${g.more ? note(g.more, 10) : ''}${g.link ? textLink(g.link.label, g.link.href) : ''}`;
	return heading + items + tail;
}

function section(s: DigestSection, readMore: string | undefined): string {
	return row(
		`${sectionLabel(s.label)}${s.groups.map((g, i) => group(s, g, i === 0, readMore)).join('')}${s.more ? note(s.more, 24) : ''}${button(
			s.cta.label,
			s.cta.href,
			{ variant: 'secondary', top: 28 },
		)}`,
		48,
	);
}

export function renderDigestHtml(m: DigestModel): string {
	const intro = row(`${eyebrow(m.eyebrow)}${headline(m.heading)}${paragraph(m.intro, { lead: true, top: 20 })}${note(m.summary, 22)}`);
	return emailDocument({
		locale: m.locale,
		title: m.subject,
		preheader: m.preheader,
		body: intro + m.sections.map((s) => section(s, m.readMore)).join(''),
		footer: {
			subscription: { reason: m.footer.reason, unsubscribeLabel: m.footer.unsubscribe, unsubscribeHref: m.footer.unsubscribeHref },
			legal: m.footer.legal,
			organisation: m.footer.organisation,
			address: m.footer.address,
		},
	});
}

export function renderDigestText(m: DigestModel): string {
	// `*word*` marks the headline's accent in HTML; plain text shows the words only.
	const lines: string[] = [m.eyebrow.toUpperCase(), '', m.heading.replace(/\*/g, ''), '', m.intro, '', m.summary];
	for (const s of m.sections) {
		lines.push('', '', s.label.toUpperCase(), '-'.repeat(s.label.length));
		for (const g of s.groups) {
			if (g.title) lines.push('', [g.title, g.badge ? `(${g.badge})` : '', g.meta ? `— ${g.meta}` : ''].filter(Boolean).join(' '));
			for (const i of g.items) {
				lines.push('', [i.meta, i.title].filter(Boolean).join('  '));
				if (i.excerpt) lines.push(i.excerpt);
				lines.push(i.href);
			}
			if (g.more) lines.push('', g.more);
			if (g.link) lines.push(`${g.link.label}: ${g.link.href}`);
		}
		if (s.more) lines.push('', s.more);
		lines.push('', `${s.cta.label}: ${s.cta.href}`);
	}
	lines.push(
		'',
		'',
		'--',
		m.footer.reason,
		'',
		`${m.footer.unsubscribe}: ${m.footer.unsubscribeHref}`,
		...m.footer.legal.map((l) => `${l.label}: ${l.href}`),
		'',
		m.footer.organisation,
		m.footer.address,
	);
	return lines.join('\n');
}
