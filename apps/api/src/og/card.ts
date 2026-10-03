// OG card HTML for Satori (workers-og). Root uses 100vw/100vh — Satori does
// not fill a percentage-height root against the canvas, which leaves a blank
// gutter. Colors mirror the site's dark museum theme (self-contained, no
// external asset fetch → DSGVO-clean).

import { wordmarkHtml } from '../brand/wordmark';

export interface OgCardInput {
  eyebrow: string; // localized type label, e.g. "Beitrag" / "Song" / "Buch"
  title: string;
  subtitle?: string | null;
  coverDataUrl?: string | null; // data: URI of the R2 cover, or null
}

// workers-og hands text nodes to satori verbatim: an entity such as `&amp;`
// is drawn as those five characters ("Bücher &amp; Schätze"). So text is not
// entity-escaped; `&` and quotes are safe inside a text node, and the only
// characters that could open markup, `<` and `>`, become ‹ and ›.
function ogText(s: string): string {
  return s.replace(/</g, '‹').replace(/>/g, '›');
}

function clamp(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export function ogCardHtml(input: OgCardInput): string {
  const title = ogText(clamp(input.title, 90));
  const subtitle = input.subtitle ? ogText(clamp(input.subtitle, 140)) : '';
  const eyebrow = ogText(input.eyebrow.toUpperCase());

  const cover = input.coverDataUrl
    ? `<div style="display:flex;width:460px;height:100%;">
         <img src="${input.coverDataUrl}" style="width:460px;height:630px;object-fit:cover;" />
       </div>`
    : '';

  const textWidth = input.coverDataUrl ? '740px' : '1200px';

  return `
  <div style="display:flex;width:100vw;height:100vh;background:#0c0b09;font-family:'Lexend','Noto Sans';">
    ${cover}
    <div style="display:flex;flex-direction:column;justify-content:center;width:${textWidth};height:100%;padding:70px 80px;">
      <div style="display:flex;color:#c9a96e;font-size:24px;font-weight:600;letter-spacing:6px;margin-bottom:28px;">${eyebrow}</div>
      <div style="display:flex;color:#f5f0e8;font-size:60px;font-weight:600;line-height:1.15;">${title}</div>
      ${subtitle ? `<div style="display:flex;color:#8a8178;font-size:28px;font-weight:400;line-height:1.4;margin-top:28px;">${subtitle}</div>` : ''}
      <div style="display:flex;align-items:baseline;margin-top:auto;">${wordmarkHtml({ size: 34, strong: '#f5f0e8', gold: '#c9a96e' })}</div>
    </div>
  </div>`;
}
