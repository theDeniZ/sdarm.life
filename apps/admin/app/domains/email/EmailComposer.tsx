'use client';

import { useState } from 'react';
import { sendEmail } from './repository';
import { getTemplate, type Locale, type TemplateName } from './templates';
import type { EmailFormData } from './types';

const PREVIEW_PLACEHOLDER = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0f0e0c; font-family:Georgia,serif; }
  p { color:#3a3830; font-size:14px; letter-spacing:1px; text-transform:uppercase; }
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
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* ── LEFT: form ── */}
      <form className="form-card" style={{ flex: '0 0 480px', minWidth: 0 }} onSubmit={submit}>
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
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} style={{ width: 80 }}>
              <option value="de">DE</option>
              <option value="en">EN</option>
            </select>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as TemplateName | '')}
              style={{ flex: 1 }}
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
            <p style={{ fontSize: 12, color: 'var(--muted, #7a7470)', marginTop: 4 }}>
              Replace <code>TOKEN</code> in the unsubscribe URL with the subscriber&apos;s token.
            </p>
          )}
        </div>

        <div className="form-row">
          <label>Body (HTML) *</label>
          <textarea
            required
            rows={20}
            placeholder={'<p>Hello,</p>\n<p>Your message here…</p>'}
            value={form.html}
            onChange={(e) => set('html', e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>

        {status && (
          <div className={status.ok ? 'state-empty' : 'state-error'} style={{ padding: '8px 0' }}>
            {status.msg}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </form>

      {/* ── RIGHT: live preview ── */}
      <div style={{ flex: 1, minWidth: 0, position: 'sticky', top: 24 }}>
        <p
          style={{ fontSize: 11, color: '#5a5450', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}
        >
          Preview
        </p>
        <iframe
          srcDoc={form.html || PREVIEW_PLACEHOLDER}
          style={{ width: '100%', height: 700, border: '1px solid #1e1c17', borderRadius: 3, display: 'block' }}
          title="Email preview"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
