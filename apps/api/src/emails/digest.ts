/**
 * HTML and plain-text renderings of the subscriber digest (issue #184).
 *
 * Email-client constraints drive every choice here, not taste:
 * - Tables for layout and inline styles on every element — Outlook (Word
 *   engine) ignores most CSS, Gmail strips `<style>` in some contexts. The one
 *   `<style>` block only adds mobile refinements; the email is readable without it.
 * - The card is fluid (`width:100%; max-width:600px`) so it fits a phone even
 *   where media queries are ignored; an MSO-only wrapper pins 600px for Outlook,
 *   which does not understand max-width.
 * - `bgcolor` attributes next to background styles — Outlook honours the attribute.
 * - System font stacks only. Loading a web font would be a third-party request
 *   carrying the reader's IP (see docs/dsgvo.md); Georgia stands in for the
 *   site's serif display face.
 * - Dark, like the site and the welcome/confirm mails, declared through
 *   `color-scheme` so clients that respect it do not invert it.
 */
import type { DigestGroup, DigestItem, DigestLink, DigestModel, DigestSection } from '../services/digest/build';
import { UNSUBSCRIBE_TOKEN } from '../services/digest/build';

const C = {
	page: '#0c0b09',
	card: '#111009',
	rule: '#26221a',
	strong: '#f0ebe3',
	text: '#d6d0c8',
	body: '#b3aca3',
	muted: '#9e9891',
	gold: '#c9a96e',
} as const;

const SERIF = "Georgia,'Times New Roman',Times,serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const label = (color: string = C.gold) =>
	`font-family:${SANS};font-size:11px;line-height:16px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${color};`;

function textLink(link: DigestLink): string {
	return `<a href="${esc(link.href)}" style="${label(C.gold)}letter-spacing:1.5px;text-decoration:none;">${esc(link.label)}&nbsp;&rarr;</a>`;
}

function button(link: DigestLink): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
  <tr>
    <td class="d-btn" style="border:1px solid ${C.gold};border-radius:2px;mso-padding-alt:12px 24px;">
      <a href="${esc(link.href)}" style="display:inline-block;padding:12px 24px;${label(C.gold)}letter-spacing:1.5px;text-decoration:none;">${esc(link.label)}</a>
    </td>
  </tr>
</table>`;
}

function more(text: string | undefined, top = 14): string {
	return text
		? `<p style="margin:${top}px 0 0;font-family:${SERIF};font-size:15px;line-height:22px;font-style:italic;color:${C.muted};">${esc(text)}</p>`
		: '';
}

/** A post: serif title, excerpt, "read more". */
function articleItem(item: DigestItem, readMore: string | undefined): string {
	return `<tr>
  <td style="padding:22px 0 0;">
    <a href="${esc(item.href)}" style="font-family:${SERIF};font-size:21px;line-height:28px;color:${C.strong};text-decoration:none;">${esc(item.title)}</a>
    ${item.excerpt ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:15px;line-height:24px;color:${C.body};">${esc(item.excerpt)}</p>` : ''}
    ${readMore ? `<p style="margin:10px 0 0;">${textLink({ label: readMore, href: item.href })}</p>` : ''}
  </td>
</tr>`;
}

/** A song or a book: a compact row with its number/author beside the title. */
function listItem(item: DigestItem, metaFirst: boolean): string {
	const meta = item.meta
		? `<span style="font-family:${SANS};font-size:13px;line-height:22px;color:${C.muted};">${esc(item.meta)}</span>`
		: '';
	const title = `<a href="${esc(item.href)}" style="font-family:${SERIF};font-size:17px;line-height:24px;color:${C.text};text-decoration:none;">${esc(item.title)}</a>`;
	if (metaFirst) {
		return `<tr>
  <td width="64" valign="top" style="width:64px;padding:9px 0 0;white-space:nowrap;">${meta}</td>
  <td valign="top" style="padding:8px 0 0;">${title}</td>
</tr>`;
	}
	return `<tr>
  <td colspan="2" style="padding:10px 0 0;">${title}${meta ? `<br>${meta}` : ''}</td>
</tr>`;
}

function group(section: DigestSection, g: DigestGroup, first: boolean, readMore: string | undefined): string {
	const heading = g.title
		? `<tr>
  <td colspan="2" style="padding:${first ? 22 : 32}px 0 0;">
    ${
			g.href
				? `<a href="${esc(g.href)}" style="font-family:${SERIF};font-size:20px;line-height:26px;color:${C.strong};text-decoration:none;">${esc(g.title)}</a>`
				: `<p style="margin:0;${label(C.muted)}letter-spacing:1.5px;">${esc(g.title)}</p>`
		}
    ${g.badge ? `&nbsp; <span style="display:inline-block;padding:2px 8px;border:1px solid ${C.rule};border-radius:2px;${label(C.gold)}font-size:10px;letter-spacing:1.5px;vertical-align:middle;">${esc(g.badge)}</span>` : ''}
    ${g.meta ? `<p style="margin:4px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};">${esc(g.meta)}</p>` : ''}
  </td>
</tr>`
		: '';
	const items =
		section.key === 'posts'
			? g.items.map((i) => articleItem(i, readMore)).join('')
			: g.items.map((i) => listItem(i, section.key === 'songs')).join('');
	const tail =
		g.more || g.link
			? `<tr><td colspan="2">${more(g.more, 10)}${g.link ? `<p style="margin:12px 0 0;">${textLink(g.link)}</p>` : ''}</td></tr>`
			: '';
	return heading + items + tail;
}

function section(s: DigestSection, readMore: string | undefined): string {
	return `<tr>
  <td class="d-pad" style="padding:40px 48px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td colspan="2" style="padding:0 0 12px;border-bottom:1px solid ${C.rule};${label()}">${esc(s.label)}</td></tr>
      ${s.groups.map((g, i) => group(s, g, i === 0, readMore)).join('')}
      <tr><td colspan="2">${more(s.more, 24)}${button(s.cta)}</td></tr>
    </table>
  </td>
</tr>`;
}

export function renderDigestHtml(m: DigestModel): string {
	const readMore = m.readMore;
	const footerLinks = [
		`<a href="${esc(m.footer.unsubscribeHref)}" style="color:${C.gold};text-decoration:underline;white-space:nowrap;">${esc(m.footer.unsubscribe)}</a>`,
		...m.footer.legal.map((l) => `<a href="${esc(l.href)}" style="color:${C.muted};text-decoration:underline;white-space:nowrap;">${esc(l.label)}</a>`),
	].join(`&nbsp;&nbsp;&middot;&nbsp; `); // plain trailing space: the only break point, links stay whole

	return `<!DOCTYPE html>
<html lang="${m.locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(m.subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background:${C.page}; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  @media only screen and (max-width:620px) {
    .d-wrap { padding:0 !important; }
    .d-card { border-left:0 !important; border-right:0 !important; }
    .d-pad { padding-left:24px !important; padding-right:24px !important; }
    .d-h1 { font-size:30px !important; line-height:36px !important; }
    .d-btn, .d-btn a { display:block !important; text-align:center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};" bgcolor="${C.page}">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${esc(m.preheader)}${'&#8199;&#65279;&#847;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
  <tr>
    <td align="center" class="d-wrap" style="padding:32px 16px;">
      <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" class="d-card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="max-width:600px;background:${C.card};border:1px solid ${C.rule};">

        <tr>
          <td class="d-pad" style="padding:28px 48px;border-bottom:1px solid ${C.rule};">
            <a href="${esc(m.home)}" style="text-decoration:none;font-family:${SERIF};font-size:19px;line-height:24px;letter-spacing:3px;"><span style="color:${C.text};text-transform:uppercase;">SDARM</span><span style="color:${C.gold};">.life</span></a>
          </td>
        </tr>

        <tr>
          <td class="d-pad" style="padding:44px 48px 0;">
            <p style="margin:0 0 16px;${label()}">${esc(m.eyebrow)}</p>
            <h1 class="d-h1" style="margin:0;font-family:${SERIF};font-size:36px;line-height:42px;font-weight:normal;color:${C.strong};">${esc(m.heading)}</h1>
            <p style="margin:18px 0 0;font-family:${SANS};font-size:16px;line-height:26px;color:${C.body};">${esc(m.intro)}</p>
            <p style="margin:22px 0 0;font-family:${SERIF};font-size:16px;line-height:24px;font-style:italic;color:${C.muted};">${esc(m.summary)}</p>
          </td>
        </tr>

        ${m.sections.map((s) => section(s, readMore)).join('')}

        <tr>
          <td class="d-pad" style="padding:48px 48px 0;"><div style="height:1px;line-height:1px;font-size:1px;background:${C.rule};">&nbsp;</div></td>
        </tr>
        <tr>
          <td class="d-pad" style="padding:24px 48px 36px;">
            <p style="margin:0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};">${esc(m.footer.reason)}</p>
            <p style="margin:14px 0 0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};">${footerLinks}</p>
            <p style="margin:14px 0 0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};">${esc(m.footer.organisation)}<br>${esc(m.footer.address)}</p>
          </td>
        </tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function renderDigestText(m: DigestModel): string {
	const lines: string[] = [m.eyebrow.toUpperCase(), '', m.heading, '', m.intro, '', m.summary];
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

/** Puts one subscriber's token into a rendering made with the placeholder. */
export function personalise(rendered: string, token: string): string {
	return rendered.replaceAll(UNSUBSCRIBE_TOKEN, encodeURIComponent(token));
}
