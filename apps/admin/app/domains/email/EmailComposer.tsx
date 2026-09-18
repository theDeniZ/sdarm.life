'use client';

import { useState } from 'react';
import { sendEmail } from './repository';
import { getTemplate, type Locale, type TemplateName } from './templates';
import type { EmailFormData } from './types';

/* The empty state lives inside the iframe, so it cannot reach the admin's CSS
   custom properties — an iframe is a separate document. The values are
   therefore literal here by necessity, but they are the *light* ones: what is
   being previewed is a white HTML email, and the sheet stays white in both
   themes so the preview always shows the message as a recipient sees it. The
   previous placeholder was near-black text on a near-black ground, which read
   as a component that had failed to load. */
const PREVIEW_PLACEHOLDER = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center;
         background:#ffffff; font-family:Georgia,serif; }
  p { color:#64748b; font-size:14px; letter-spacing:1px; text-transform:uppercase; }
</style></head>
<body><p>Preview will appear here</p></body>
</html>`;

export default function EmailComposer() {
  const [form, setForm] = useState<EmailFormData>({ to: '', subject: '', html: '' });
  const [locale, setLocale] = useState<Locale>('de');
  const [template, setTemplate] = useState<TemplateName | ''>('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  function set<K extends keyof EmailFormData>(k: K, v: EmailFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function loadTemplate() {
    if (!template) return;
    set('html', getTemplate(template, locale));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      await sendEmail(form);
      setStatus({ ok: true, msg: `Email sent to ${form.to}` });
      setForm({ to: '', subject: '', html: '' });
      setTemplate('');
    } catch (err) {
      setStatus({ ok: false, msg: String(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="email-layout">
      {/* ── LEFT: form ── */}
      <form className="form-card" onSubmit={submit}>
        <div className="form-row">
          <label>To *</label>
          <input
            type="email"
            required
            placeholder="recipient@example.com"
            value={form.to}
            onChange={(e) => set('to', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Subject *</label>
          <input
            type="text"
            required
            placeholder="Email subject"
            value={form.subject}
            onChange={(e) => set('subject', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Template</label>
          <div className="email-template-row">
            <select
              className="email-template-locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="de">DE</option>
              <option value="en">EN</option>
            </select>
            <select
              className="email-template-select"
              value={template}
              onChange={(e) => setTemplate(e.target.value as TemplateName | '')}
            >
              <option value="">— none —</option>
              <option value="base">Base layout</option>
              <option value="updates">We&apos;ve got updates</option>
            </select>
            <button type="button" className="btn-ghost" onClick={loadTemplate} disabled={!template}>
              Load
            </button>
          </div>
          {template && (
            <p className="email-hint">
              Replace <code>TOKEN</code> in the unsubscribe URL with the subscriber&apos;s token.
            </p>
          )}
        </div>

        <div className="form-row">
          <label>Body (HTML) *</label>
          <textarea
            className="email-body"
            required
            rows={20}
            placeholder={'<p>Hello,</p>\n<p>Your message here…</p>'}
            value={form.html}
            onChange={(e) => set('html', e.target.value)}
          />
        </div>

        {status && <div className={`email-status ${status.ok ? 'state-empty' : 'state-error'}`}>{status.msg}</div>}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </form>

      {/* ── RIGHT: live preview ── */}
      <div className="email-preview">
        <p className="email-preview__label">Preview</p>
        <iframe
          className="email-preview__frame"
          srcDoc={form.html || PREVIEW_PLACEHOLDER}
          title="Email preview"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
