'use client';

import { useEffect, useState } from 'react';
import type { EmailTemplateDto } from '@sdarm/types';
import { fetchEmailTemplates, sendEmail } from './repository';
import EmailPreview, { PLACEHOLDER } from './EmailPreview';
import type { EmailFormData } from './types';

type Locale = 'de' | 'en';

const PREVIEW_PLACEHOLDER = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center;
         background:#ffffff; font-family:Georgia,serif; }
  p { color:#64748b; font-size:14px; letter-spacing:1px; text-transform:uppercase; }
</style></head>
<body><p>Preview will appear here</p></body>
</html>`;

/** Every distinct [[placeholder]] still in the subject or body. */
function placeholdersLeft(form: EmailFormData): string[] {
  return [...new Set([...form.subject.matchAll(PLACEHOLDER), ...form.html.matchAll(PLACEHOLDER)].map((m) => m[0]))];
}

export default function EmailComposer() {
  const [form, setForm] = useState<EmailFormData>({ to: '', subject: '', html: '' });
  const [locale, setLocale] = useState<Locale>('de');
  const [templates, setTemplates] = useState<EmailTemplateDto[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<EmailTemplateDto['id'] | ''>('');
  const [loaded, setLoaded] = useState<EmailTemplateDto | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    let live = true;
    setTemplatesError(null);
    fetchEmailTemplates(locale)
      .then((t) => live && setTemplates(t))
      .catch((err) => live && setTemplatesError(String(err)));
    return () => {
      live = false;
    };
  }, [locale]);

  const selected = templates.find((t) => t.id === templateId) ?? null;

  function set<K extends keyof EmailFormData>(k: K, v: EmailFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function loadTemplate() {
    if (!selected) return;
    if (
      form.html.trim() &&
      form.html !== loaded?.html &&
      !confirm('Replace the body you have written with this template?')
    )
      return;
    // The subject follows the template unless the operator already typed their own.
    setForm((f) => ({
      ...f,
      subject: !f.subject.trim() || f.subject === loaded?.subject ? selected.subject : f.subject,
      html: selected.html,
    }));
    setLoaded(selected);
    setStatus(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const left = placeholdersLeft(form);
    if (left.length > 0) {
      setStatus({
        ok: false,
        msg: `Replace ${left.length === 1 ? 'the placeholder' : `all ${left.length} placeholders`} first, starting with ${left[0]}.`,
      });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      await sendEmail(form);
      setStatus({ ok: true, msg: `Email sent to ${form.to}` });
      setForm({ to: '', subject: '', html: '' });
      setTemplateId('');
      setLoaded(null);
    } catch (err) {
      setStatus({ ok: false, msg: String(err) });
    } finally {
      setSending(false);
    }
  }

  const left = form.html ? placeholdersLeft(form).length : 0;

  return (
    <div className="email-layout">
      <form className="form-card" onSubmit={submit}>
        <div className="form-row">
          <label htmlFor="email-to">To *</label>
          <input
            id="email-to"
            type="email"
            required
            placeholder="recipient@example.com"
            value={form.to}
            onChange={(e) => set('to', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="email-subject">Subject *</label>
          <input
            id="email-subject"
            type="text"
            required
            placeholder="Email subject"
            value={form.subject}
            onChange={(e) => set('subject', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="email-template">Template</label>
          <div className="email-template-row">
            <select
              aria-label="Template language"
              className="email-template-locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="de">DE</option>
              <option value="en">EN</option>
            </select>
            <select
              id="email-template"
              className="email-template-select"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value as EmailTemplateDto['id'] | '')}
            >
              <option value="">— none —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn-ghost" onClick={loadTemplate} disabled={!selected}>
              Load
            </button>
          </div>
          {templatesError ? (
            <p className="flash-err">Templates could not be loaded: {templatesError}</p>
          ) : (
            selected && (
              <p className="email-hint">
                {selected.description}{' '}
                {selected.audience === 'subscribers'
                  ? 'The unsubscribe link is filled in for the recipient on send; if the address is not a subscriber, those footer lines are left out.'
                  : 'No unsubscribe line — for one person, not the mailing list.'}
              </p>
            )
          )}
        </div>

        <div className="form-row">
          <label htmlFor="email-body">Body (HTML) *</label>
          <textarea
            id="email-body"
            className="email-body"
            required
            rows={20}
            placeholder={'<p>Hello,</p>\n<p>Your message here…</p>'}
            value={form.html}
            onChange={(e) => set('html', e.target.value)}
          />
          {left > 0 && (
            <p className="email-hint">
              {left} {left === 1 ? 'placeholder' : 'placeholders'} in <code>[[…]]</code> left to replace — highlighted
              in the preview. Sending is blocked until they are gone.
            </p>
          )}
        </div>

        {status && <div className={`email-status ${status.ok ? 'state-empty' : 'state-error'}`}>{status.msg}</div>}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </form>

      <EmailPreview label={form.subject || 'Preview'} html={form.html || PREVIEW_PLACEHOLDER} title="Email preview" />
    </div>
  );
}
