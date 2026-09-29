'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DigestFrequency, DigestPreviewDto, DigestRunDto, DigestSettingsDto } from '@sdarm/types';
import { fetchDigestPreview, fetchDigestSettings, saveDigestSettings, sendDigestTest } from './repository';

// Subscriber digest (issue #184): one email per scheduled run, only when
// something new was published. The schedule runs on the API Worker's Cron
// Trigger; this panel switches it on, sets the day, and previews the next one.

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FREQUENCIES: { value: DigestFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly — first of the month' },
];

/* Same reasoning as the composer's placeholder: an iframe cannot read the
   admin's tokens, so the literals here are deliberate. */
const EMPTY_PREVIEW = (message: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center;
         background:#ffffff; font-family:Georgia,serif; padding:0 32px; box-sizing:border-box; }
  p { color:#64748b; font-size:14px; line-height:1.6; letter-spacing:.5px; text-align:center; max-width:420px; }
</style></head><body><p>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p></body></html>`;

function fmtWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO → the local wall-clock value a datetime-local input expects. */
function toInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function countsLine(c: DigestPreviewDto['counts']): string {
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
  return [
    n(c.posts, 'post', 'posts'),
    n(c.songs, 'song', 'songs'),
    n(c.books, 'new book', 'new books'),
    n(c.revisedBooks, 'revised book', 'revised books'),
  ].join(' · ');
}

function runLabel(run: DigestRunDto | null): string {
  if (!run) return 'No scheduled run yet';
  const when = fmtWhen(run.at);
  switch (run.outcome) {
    case 'sent':
      return `${when} — sent to ${run.recipients} subscriber${run.recipients === 1 ? '' : 's'}`;
    case 'nothing-new':
      return `${when} — nothing new, no email sent`;
    case 'not-configured':
      return `${when} — skipped, sending is not configured`;
    case 'failed':
      return `${when} — failed${run.recipients ? ` after ${run.recipients} sent` : ''}: ${run.detail ?? 'unknown error'}`;
  }
}

export default function DigestPanel() {
  const [settings, setSettings] = useState<DigestSettingsDto | null>(null);
  const [draft, setDraft] = useState<{ enabled: boolean; frequency: DigestFrequency; weekday: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  const [locale, setLocale] = useState<'de' | 'en'>('de');
  const [since, setSince] = useState(''); // '' = where the next digest starts
  const [phone, setPhone] = useState(false);
  const [preview, setPreview] = useState<DigestPreviewDto | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testFlash, setTestFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetchDigestSettings()
      .then((s) => {
        setSettings(s);
        setDraft({ enabled: s.enabled, frequency: s.frequency, weekday: s.weekday });
      })
      .catch((err) => setFlash({ ok: false, msg: String(err) }));
  }, []);

  const loadPreview = useCallback(() => {
    setLoadingPreview(true);
    setPreviewError(null);
    fetchDigestPreview(locale, since ? new Date(since).toISOString() : undefined)
      .then(setPreview)
      .catch((err) => setPreviewError(String(err)))
      .finally(() => setLoadingPreview(false));
  }, [locale, since]);

  // Re-render on language change; the window date applies on "Refresh".
  useEffect(loadPreview, [locale]);

  async function save() {
    if (!draft || !settings) return;
    if (draft.enabled && !settings.enabled) {
      const total = settings.recipients.de + settings.recipients.en;
      if (!confirm(`Switch on the automatic digest for ${total} confirmed subscriber${total === 1 ? '' : 's'}?`))
        return;
    }
    setSaving(true);
    setFlash(null);
    try {
      const s = await saveDigestSettings(draft);
      setSettings(s);
      setDraft({ enabled: s.enabled, frequency: s.frequency, weekday: s.weekday });
      setFlash({ ok: true, msg: s.enabled ? 'Saved. The digest is on.' : 'Saved. The digest is off.' });
      if (!since) loadPreview();
    } catch (err) {
      setFlash({ ok: false, msg: String(err) });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    setTestFlash(null);
    try {
      await sendDigestTest(testTo.trim(), locale, since ? new Date(since).toISOString() : undefined);
      setTestFlash({ ok: true, msg: `Test digest (${locale.toUpperCase()}) sent to ${testTo.trim()}.` });
    } catch (err) {
      setTestFlash({ ok: false, msg: String(err) });
    } finally {
      setTesting(false);
    }
  }

  const dirty =
    !!draft &&
    !!settings &&
    (draft.enabled !== settings.enabled ||
      draft.frequency !== settings.frequency ||
      draft.weekday !== settings.weekday);

  let frame = EMPTY_PREVIEW('Loading preview…');
  if (previewError) frame = EMPTY_PREVIEW(`Preview failed: ${previewError}`);
  else if (preview && !preview.hasContent)
    frame = EMPTY_PREVIEW(`Nothing new since ${fmtWhen(preview.since)}. A scheduled run would send no email.`);
  else if (preview) frame = preview.html;

  return (
    <section className="digest">
      <h2 className="config-section-title">Update digest</h2>
      <div className="email-layout">
        <div className="form-card">
          <p className="digest-intro">
            One email to every confirmed subscriber, in their language, listing what was published since the last one —
            posts, songs by songbook, books. Long lists are cut to a few items. When nothing is new, nothing is sent.
          </p>

          {!settings || !draft ? (
            flash ? (
              <p className="flash-err">{flash.msg}</p>
            ) : (
              <p className="digest-meta">Loading…</p>
            )
          ) : (
            <>
              {!settings.sendingConfigured && (
                <p className="flash-err digest-warning">
                  Email sending is not configured on this server. Scheduled runs are skipped.
                </p>
              )}

              <div className="form-row">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                  />
                  Send the digest automatically
                </label>
              </div>

              <div className="digest-schedule">
                <div className="form-row">
                  <label htmlFor="digest-frequency">Frequency</label>
                  <select
                    id="digest-frequency"
                    value={draft.frequency}
                    onChange={(e) => setDraft({ ...draft, frequency: e.target.value as DigestFrequency })}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label htmlFor="digest-weekday">Day</label>
                  <select
                    id="digest-weekday"
                    value={draft.weekday}
                    onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}
                  >
                    {WEEKDAYS.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="email-hint">Sent around 09:00 German time (08:00 in winter).</p>

              <dl className="digest-facts">
                <dt>Next digest</dt>
                <dd>{settings.enabled ? fmtWhen(settings.nextRun) : 'Off'}</dd>
                <dt>Covers content since</dt>
                <dd>{fmtWhen(settings.since)}</dd>
                <dt>Recipients</dt>
                <dd>
                  {settings.recipients.de + settings.recipients.en} confirmed (DE {settings.recipients.de} · EN{' '}
                  {settings.recipients.en})
                </dd>
                <dt>Last run</dt>
                <dd>{runLabel(settings.lastRun)}</dd>
              </dl>

              {flash && <p className={flash.ok ? 'flash-ok' : 'flash-err'}>{flash.msg}</p>}

              <div className="form-actions">
                <button type="button" className="btn-primary" onClick={save} disabled={saving || !dirty}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          )}

          <div className="digest-divider" />

          <div className="digest-schedule">
            <div className="form-row">
              <label htmlFor="digest-locale">Preview language</label>
              <select id="digest-locale" value={locale} onChange={(e) => setLocale(e.target.value as 'de' | 'en')}>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="digest-since">Content since</label>
              <input
                id="digest-since"
                type="datetime-local"
                value={since || (preview ? toInput(preview.since) : '')}
                onChange={(e) => setSince(e.target.value)}
              />
            </div>
          </div>
          <div className="digest-row">
            <button type="button" className="btn-ghost" onClick={loadPreview} disabled={loadingPreview}>
              {loadingPreview ? 'Loading…' : 'Refresh preview'}
            </button>
            {since && (
              <button type="button" className="btn-ghost" onClick={() => setSince('')}>
                Reset to next digest
              </button>
            )}
          </div>
          {preview && (
            <p className="email-hint">
              {countsLine(preview.counts)}. Changing the date only affects this preview and test sends.
            </p>
          )}

          <form className="digest-test" onSubmit={sendTest}>
            <div className="form-row">
              <label htmlFor="digest-test-to">Send test to</label>
              <div className="digest-row">
                <input
                  id="digest-test-to"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <button type="submit" className="btn-ghost" disabled={testing || !preview?.hasContent}>
                  {testing ? 'Sending…' : 'Send test'}
                </button>
              </div>
            </div>
            <p className="email-hint">One email to this address only, marked [Test]. Its unsubscribe link is inert.</p>
            {testFlash && <p className={testFlash.ok ? 'flash-ok' : 'flash-err'}>{testFlash.msg}</p>}
          </form>
        </div>

        <div className="email-preview">
          <div className="digest-preview-head">
            <p className="email-preview__label">{preview?.hasContent ? preview.subject : 'Digest preview'}</p>
            <select
              aria-label="Preview width"
              className="digest-width"
              value={phone ? 'phone' : 'desktop'}
              onChange={(e) => setPhone(e.target.value === 'phone')}
            >
              <option value="desktop">Desktop</option>
              <option value="phone">Phone</option>
            </select>
          </div>
          <iframe
            className={`email-preview__frame${phone ? ' digest-frame--phone' : ''}`}
            srcDoc={frame}
            title="Digest preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </section>
  );
}
