'use client';

import { useState } from 'react';

/** Text the operator must replace — the API's composer templates mark it this way. */
export const PLACEHOLDER = /\[\[[^\]]+\]\]/g;

/**
 * Marks every [[placeholder]] in the preview. Only text between tags is
 * touched, so a placeholder inside an attribute (a link) never breaks markup.
 */
function highlight(html: string): string {
  return html.replace(
    />([^<]+)</g,
    (_, text: string) =>
      `>${text.replace(PLACEHOLDER, (m) => `<mark style="background:rgba(201,169,110,0.32);color:inherit;border-radius:3px;padding:0 2px;">${m}</mark>`)}<`
  );
}

/**
 * The emails turn light through `@media (prefers-color-scheme: light)`, which
 * inside an iframe follows the operator's OS, not this admin's theme toggle.
 * Rewriting that one query shows either variant on demand, preview only.
 */
function withScheme(html: string, scheme: 'dark' | 'light'): string {
  return html.replace(/@media \(prefers-color-scheme: light\)/g, scheme === 'light' ? '@media all' : '@media not all');
}

/** Live preview of an email document: phone/desktop width, dark/light variant. */
export default function EmailPreview({ label, html, title }: { label: string; html: string; title: string }) {
  const [phone, setPhone] = useState(false);
  const [scheme, setScheme] = useState<'dark' | 'light'>('dark');

  return (
    <div className="email-preview">
      <div className="email-preview-head">
        <p className="email-preview__label">{label}</p>
        <div className="email-preview-controls">
          <select
            aria-label="Preview appearance"
            className="email-preview-select"
            value={scheme}
            onChange={(e) => setScheme(e.target.value as 'dark' | 'light')}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
          <select
            aria-label="Preview width"
            className="email-preview-select"
            value={phone ? 'phone' : 'desktop'}
            onChange={(e) => setPhone(e.target.value === 'phone')}
          >
            <option value="desktop">Desktop</option>
            <option value="phone">Phone</option>
          </select>
        </div>
      </div>
      <iframe
        className={`email-preview__frame${phone ? ' email-preview__frame--phone' : ''}`}
        srcDoc={highlight(withScheme(html, scheme))}
        title={title}
        sandbox="allow-same-origin"
      />
    </div>
  );
}
