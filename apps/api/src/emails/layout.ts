/**
 * The one email design system: every message the API sends (and every starting
 * point the admin composer offers) is rendered through `emailDocument()` and the
 * partials below, so a change of colour or type happens here once.
 *
 * Email-client constraints drive every choice here, not taste:
 * - Tables for layout and inline styles on every element — Outlook (Word engine)
 *   ignores most CSS, Gmail strips `<style>` in some contexts. The `<style>` block
 *   only adds refinements (phone widths, the light variant); every email is
 *   complete and readable without it.
 * - The card is fluid (`width:100%; max-width:600px`) so it fits a phone even
 *   where media queries are ignored; an MSO-only wrapper pins 600px for Outlook,
 *   which does not understand max-width.
 * - `bgcolor` attributes next to background styles — Outlook honours the attribute.
 * - System font stacks only. Loading a web font would be a third-party request
 *   carrying the reader's IP (see docs/dsgvo.md). The site's faces lead each
 *   stack and are used only where the reader has them installed; Georgia stands
 *   in for the serif display face, the system UI face for Lexend.
 * - Dark by default, like the site. Clients that report a light preference and
 *   honour `prefers-color-scheme` (Apple Mail, iOS Mail, Outlook for Mac) get the
 *   site's light palette through the `e-*` classes; clients that do not (Gmail,
 *   Outlook for Windows) keep the dark one, which is complete on its own.
 * - Buttons are pills like the site's, with a VML roundrect for Outlook for
 *   Windows, which cannot round an `<a>`.
 * - No images, no remote CSS, no tracking pixel: nothing in an email phones home.
 */
import de from '@sdarm/i18n/messages/de';
import en from '@sdarm/i18n/messages/en';
import { wordmarkHtml } from '../brand/wordmark';

export type EmailLocale = 'de' | 'en';

/** Public site origin. Production on purpose: emails are read outside any request. */
export const WEB_ORIGIN = 'https://sdarm.life';

/**
 * Stands in for a subscriber's token in a rendering made once and sent to many;
 * `personalise()` swaps in each recipient's own. The admin composer's subscriber
 * templates carry it too, and the single-send route fills it in.
 */
export const UNSUBSCRIBE_TOKEN = '__UNSUBSCRIBE_TOKEN__';

/** Wraps the footer lines that only make sense for a subscriber (reason + unsubscribe link). */
export const SUBSCRIPTION_START = '<!--subscription-->';
export const SUBSCRIPTION_END = '<!--/subscription-->';

/** Puts one subscriber's token into a rendering made with the placeholder. */
export function personalise(rendered: string, token: string): string {
	return rendered.replaceAll(UNSUBSCRIBE_TOKEN, encodeURIComponent(token));
}

/** Removes the subscriber-only footer lines — for a recipient who is not on the list. */
export function stripSubscription(rendered: string): string {
	const pattern = new RegExp(`${SUBSCRIPTION_START}[\\s\\S]*?${SUBSCRIPTION_END}`, 'g');
	return rendered.replace(pattern, '');
}

export function unsubscribeHref(locale: EmailLocale, token: string = UNSUBSCRIBE_TOKEN): string {
	return `${WEB_ORIGIN}/${locale}/unsubscribe?token=${token}`;
}

export function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Tokens ─────────────────────────────────────────────────────────────────────

/** Dark palette — the site's dark theme (packages/ui tokens.css), flattened to solid colours. */
export const C = {
	page: '#0c0b09',
	card: '#141210',
	rule: '#29251d',
	strong: '#f0ebe3',
	text: '#d6d0c8',
	body: '#b3aca3',
	muted: '#9e9891',
	gold: '#c9a96e',
	ink: '#0e0e12',
} as const;

/** Light palette — the site's light theme. Applied only through `prefers-color-scheme: light`. */
const L = {
	page: '#f3f0ea',
	card: '#fcfbf8',
	rule: '#e4ddcf',
	strong: '#0e0e12',
	text: '#1c1c22',
	body: '#3f3f4a',
	muted: '#6b6b78',
	gold: '#866a1f',
} as const;

export const SERIF = "'Playfair Display',Georgia,'Times New Roman',Times,serif";
export const SANS = "Lexend,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/** Content inset inside the card. Phones get 24px through `.e-pad`. */
const PAD = 48;

// ── Partials ───────────────────────────────────────────────────────────────────
// Each returns markup for the inside of a card row; `row()` makes the row.

/** One full-width row of the card, with the standard side inset. */
export function row(inner: string, top = 0, bottom = 0): string {
	return `<tr>
  <td class="e-pad" style="padding:${top}px ${PAD}px ${bottom}px;">${inner}</td>
</tr>`;
}

/**
 * Escapes `text`, then renders `*words*` in the site's italic gold accent —
 * the "die Welt *geliebt*" treatment of the home page hero.
 */
export function accent(text: string): string {
	return esc(text).replace(/\*([^*]+)\*/g, `<em class="e-gold" style="font-style:italic;color:${C.gold};">$1</em>`);
}

/** Small uppercase label above a headline or a section. */
export function eyebrow(text: string, bottom = 18): string {
	return `<p class="e-gold" style="margin:0 0 ${bottom}px;font-family:${SANS};font-size:11px;line-height:16px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${C.gold};">${esc(text)}</p>`;
}

/** The email's one headline. `*word*` is set in the italic gold accent. */
export function headline(text: string): string {
	return `<h1 class="e-strong e-h1" style="margin:0;font-family:${SERIF};font-size:36px;line-height:42px;font-weight:normal;color:${C.strong};">${accent(text)}</h1>`;
}

/** A serif sub-heading — an item title, a section title. Linked when `href` is given. Plain text: no accent marks, titles are data. */
export function title(text: string, opts: { href?: string; size?: number; top?: number } = {}): string {
	const size = opts.size ?? 22;
	const style = `font-family:${SERIF};font-size:${size}px;line-height:${Math.round(size * 1.3)}px;font-weight:normal;color:${C.strong};text-decoration:none;`;
	const inner = opts.href ? `<a class="e-strong" href="${esc(opts.href)}" style="${style}">${esc(text)}</a>` : esc(text);
	return `<p class="e-strong" style="margin:${opts.top ?? 0}px 0 0;${style}">${inner}</p>`;
}

/** Body copy. `lead` is the larger first paragraph under the headline. */
export function paragraph(text: string, opts: { top?: number; lead?: boolean; html?: boolean } = {}): string {
	const size = opts.lead ? 17 : 15;
	const line = opts.lead ? 28 : 25;
	const content = opts.html ? text : esc(text);
	return `<p class="e-body" style="margin:${opts.top ?? 16}px 0 0;font-family:${SANS};font-size:${size}px;line-height:${line}px;color:${C.body};">${content}</p>`;
}

/** Quiet serif italic — a note, a summary line, "and 5 more". */
export function note(text: string, top = 16): string {
	return `<p class="e-muted" style="margin:${top}px 0 0;font-family:${SERIF};font-size:15px;line-height:23px;font-style:italic;color:${C.muted};">${esc(text)}</p>`;
}

/** Small print in the sans face. */
export function small(text: string, top = 16): string {
	return `<p class="e-muted" style="margin:${top}px 0 0;font-family:${SANS};font-size:13px;line-height:21px;color:${C.muted};">${esc(text)}</p>`;
}

/** An uppercase gold text link with an arrow — "Read more →". */
export function textLink(label: string, href: string, top = 12): string {
	return `<p style="margin:${top}px 0 0;"><a class="e-gold" href="${esc(href)}" style="font-family:${SANS};font-size:11px;line-height:16px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${C.gold};text-decoration:none;">${esc(label)}&nbsp;&rarr;</a></p>`;
}

/** A 1px hairline. */
export function divider(top = 32, bottom = 0): string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${top}px 0 ${bottom}px;"><tr><td class="e-fill-rule" height="1" style="height:1px;line-height:1px;font-size:1px;background:${C.rule};" bgcolor="${C.rule}">&nbsp;</td></tr></table>`;
}

/** A section heading: uppercase label on a hairline. */
export function sectionLabel(text: string): string {
	return `<p class="e-gold e-rule" style="margin:0;padding:0 0 12px;border-bottom:1px solid ${C.rule};font-family:${SANS};font-size:11px;line-height:16px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${C.gold};">${esc(text)}</p>`;
}

/**
 * Pill button, like the site's. `primary` is the gold fill; `secondary` the
 * outlined pill. Outlook for Windows gets a VML roundrect of the same shape.
 */
export function button(label: string, href: string, opts: { variant?: 'primary' | 'secondary'; top?: number } = {}): string {
	const primary = (opts.variant ?? 'primary') === 'primary';
	const h = esc(href);
	const text = `${esc(label)}&nbsp;&rarr;`;
	// VML needs a fixed width; estimate from the label so the text never wraps.
	const width = Math.max(150, Math.round(label.length * 8.6 + 64));
	const vml = primary ? `fillcolor="${C.gold}" stroke="f"` : `fillcolor="${C.card}" strokecolor="${C.gold}" strokeweight="1px"`;
	const color = primary ? C.ink : C.gold;
	const style = primary
		? `background:${C.gold};border:1px solid ${C.gold};color:${C.ink};`
		: `background:transparent;border:1px solid ${C.gold};color:${C.gold};`;
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${opts.top ?? 32}px 0 0;">
  <tr>
    <td class="e-btn-cell">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${h}" style="height:46px;v-text-anchor:middle;width:${width}px;" arcsize="50%" ${vml}><w:anchorlock/><center style="color:${color};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${text}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!--><a class="${primary ? 'e-btn' : 'e-btn2 e-gold'}" href="${h}" style="display:inline-block;${style}border-radius:999px;padding:13px 28px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:600;letter-spacing:0.3px;text-decoration:none;">${text}</a><!--<![endif]-->
    </td>
  </tr>
</table>`;
}

/** Label/value rows — event details, a form submission. Values are escaped. */
export function details(rows: [string, string][], top = 28): string {
	const body = rows
		.map(
			([k, v], i) => `<tr>
  <td class="e-muted e-rule e-dt" valign="top" width="132" style="width:132px;padding:12px 16px 12px 0;${i ? `border-top:1px solid ${C.rule};` : ''}font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};">${esc(k)}</td>
  <td class="e-text e-rule" valign="top" style="padding:12px 0;${i ? `border-top:1px solid ${C.rule};` : ''}font-family:${SANS};font-size:15px;line-height:22px;color:${C.text};">${esc(v).replace(/\n/g, '<br>')}</td>
</tr>`,
		)
		.join('');
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="e-rule" style="margin:${top}px 0 0;border-top:1px solid ${C.rule};border-bottom:1px solid ${C.rule};">${body}</table>`;
}

/** Closing lines — "Kind regards" and a name — one per line. */
export function signoff(lines: string[], top = 32): string {
	return `<p class="e-text" style="margin:${top}px 0 0;font-family:${SANS};font-size:15px;line-height:25px;color:${C.text};">${lines.map(esc).join('<br>')}</p>`;
}

/** A Bible verse or quotation: serif italic with a gold rule, reference below. */
export function quote(text: string, reference: string, top = 28): string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${top}px 0 0;">
  <tr>
    <td class="e-rule-gold" width="2" style="width:2px;background:${C.gold};" bgcolor="${C.gold}"></td>
    <td style="padding:2px 0 2px 22px;">
      <p class="e-strong" style="margin:0;font-family:${SERIF};font-size:22px;line-height:32px;font-style:italic;color:${C.strong};">${esc(text)}</p>
      <p class="e-gold" style="margin:12px 0 0;font-family:${SANS};font-size:11px;line-height:16px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${C.gold};">${esc(reference)}</p>
    </td>
  </tr>
</table>`;
}

// ── Footer ─────────────────────────────────────────────────────────────────────

export interface FooterSubscription {
	/** Why the reader gets this email. */
	reason: string;
	unsubscribeLabel: string;
	/** Usually made with `UNSUBSCRIBE_TOKEN`, personalised per recipient. */
	unsubscribeHref: string;
}

export interface EmailFooter {
	subscription?: FooterSubscription;
	legal: { label: string; href: string }[];
	organisation: string;
	address: string;
}

/**
 * Impressum/Datenschutz links and the association's name and address, taken
 * from `legal.impressum.section1Body` in @sdarm/i18n so the Impressum stays the
 * single source.
 */
export function legalFooter(locale: EmailLocale, subscription?: FooterSubscription): EmailFooter {
	const legal = (locale === 'en' ? en : de).web.legal;
	const [organisation, ...addressLines] = legal.impressum.section1Body.split('\n');
	return {
		subscription,
		legal: [
			{ label: legal.impressum.title, href: `${WEB_ORIGIN}/${locale}/impressum` },
			{ label: legal.datenschutz.title, href: `${WEB_ORIGIN}/${locale}/datenschutz` },
		],
		organisation,
		address: addressLines.join(', '),
	};
}

function footerHtml(f: EmailFooter, home: string): string {
	const sep = `<span class="e-muted" style="color:${C.muted};">&nbsp;&nbsp;&middot;&nbsp; </span>`; // trailing plain space: the only break point
	const link = (label: string, href: string) =>
		`<a class="e-muted" href="${esc(href)}" style="color:${C.muted};text-decoration:underline;white-space:nowrap;">${esc(label)}</a>`;
	const small = `margin:0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};`;
	const subscription = f.subscription
		? `${SUBSCRIPTION_START}<p class="e-muted" style="${small}">${esc(f.subscription.reason)}</p>
      <p style="margin:10px 0 18px;font-family:${SANS};font-size:12px;line-height:19px;"><a class="e-gold" href="${esc(f.subscription.unsubscribeHref)}" style="color:${C.gold};text-decoration:underline;">${esc(f.subscription.unsubscribeLabel)}</a></p>${SUBSCRIPTION_END}`
		: '';
	return `<tr>
  <td class="e-pad" style="padding:28px ${PAD}px 8px;">
      ${subscription}
      <p class="e-muted" style="${small}">${[...f.legal.map((l) => link(l.label, l.href)), link('sdarm.life', home)].join(sep)}</p>
      <p class="e-muted" style="${small}margin-top:10px;">${esc(f.organisation)}<br>${esc(f.address)}</p>
  </td>
</tr>`;
}

// ── Document ───────────────────────────────────────────────────────────────────

export interface EmailDocument {
	locale: EmailLocale;
	/** The `<title>` — usually the subject. */
	title: string;
	/** Inbox preview line after the subject. */
	preheader?: string;
	/** Card rows, made with `row()`. */
	body: string;
	footer: EmailFooter;
}

/** Light-palette overrides, keyed by the classes the partials set. */
const LIGHT = `
    .e-page { background:${L.page} !important; }
    .e-card { background:${L.card} !important; border-color:${L.rule} !important; }
    .e-strong { color:${L.strong} !important; }
    .e-text { color:${L.text} !important; }
    .e-body { color:${L.body} !important; }
    .e-muted { color:${L.muted} !important; }
    .e-gold { color:${L.gold} !important; }
    .e-rule { border-color:${L.rule} !important; }
    .e-fill-rule { background:${L.rule} !important; }
    .e-rule-gold { background:${L.gold} !important; }
    .e-btn2 { border-color:${L.gold} !important; }`;

export function emailDocument(d: EmailDocument): string {
	const home = `${WEB_ORIGIN}/${d.locale}`;
	const preheader = d.preheader
		? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${esc(d.preheader)}${'&#8199;&#65279;&#847;'.repeat(40)}</div>`
		: '';
	return `<!DOCTYPE html>
<html lang="${d.locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(d.title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background:${C.page}; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  a { text-underline-offset:2px; }
  @media only screen and (max-width:620px) {
    .e-wrap { padding:20px 0 28px !important; }
    .e-card { border-left:0 !important; border-right:0 !important; border-radius:0 !important; }
    .e-pad { padding-left:24px !important; padding-right:24px !important; }
    .e-h1 { font-size:30px !important; line-height:36px !important; }
    .e-dt { width:96px !important; }
  }
  @media (prefers-color-scheme: light) {${LIGHT}
  }
</style>
</head>
<body class="e-page" style="margin:0;padding:0;background:${C.page};" bgcolor="${C.page}">
${preheader}
<table role="presentation" class="e-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
  <tr>
    <td align="center" class="e-wrap" style="padding:36px 16px 40px;">
      <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr>
          <td class="e-pad" style="padding:0 ${PAD}px 22px;">
            <a href="${esc(home)}" style="text-decoration:none;font-size:23px;line-height:28px;">${wordmarkHtml({ size: 23, strong: C.strong, gold: C.gold, strongClass: 'e-strong', goldClass: 'e-gold' })}</a>
          </td>
        </tr>
        <tr>
          <td>
            <table role="presentation" class="e-card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.rule};border-radius:16px;border-collapse:separate;">
              <tr><td style="height:48px;line-height:48px;font-size:1px;">&nbsp;</td></tr>
${d.body}
              <tr><td style="height:48px;line-height:48px;font-size:1px;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
${footerHtml(d.footer, home)}
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}
