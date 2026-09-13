'use client';

import { useState } from 'react';
import type { BibleAdminTranslationDto, BibleLicenseBasis } from '@sdarm/types';
import { BASIS_LABEL, fromLicenseForm, toLicenseForm, type LicenseForm } from './types';

const BASIS_OPTIONS: BibleLicenseBasis[] = ['public-domain', 'permission', 'provider'];

const BASIS_HELP: Record<BibleLicenseBasis, string> = {
  'public-domain': 'Copyright has lapsed. No rights holder to name, but record where the text came from.',
  permission: 'A rights holder granted this in writing. Record the proof — an email thread, a contract number.',
  provider: 'Served under an upstream provider’s terms (YouVersion). Their conditions govern, not ours.',
};

/**
 * The four gates, and — the part an operator signing a license actually needs —
 * where each one is enforced. Three are refused by the API. `allowProjector` is
 * not, and saying so is the whole point of this table.
 */
const GATES: {
  key: 'allowDownload' | 'allowOffline' | 'allowSearchIndex' | 'allowProjector';
  label: string;
  where: 'api' | 'ui';
  note: string;
}[] = [
  {
    key: 'allowDownload',
    label: 'Bulk download',
    where: 'api',
    note: 'GET /bible/translations/{code}/bundle returns 403 when off.',
  },
  {
    key: 'allowOffline',
    label: 'Offline copy on a device',
    where: 'api',
    note: 'Same bundle route; the bundle generator skips the translation entirely.',
  },
  {
    key: 'allowSearchIndex',
    label: 'Full-text search',
    where: 'api',
    note: 'GET /bible/search refuses this translation, and the ingest leaves it out of the index.',
  },
  {
    key: 'allowProjector',
    label: 'Projector / presenter display',
    where: 'ui',
    note: 'Hides the projector entry points on treasures.sdarm.life. The projector reads the same chapter route as the reader, so the API cannot tell them apart — this switch removes the button, it does not refuse a request.',
  },
];

type Props = {
  translation: BibleAdminTranslationDto;
  onSave: (patch: ReturnType<typeof fromLicenseForm>) => Promise<void>;
};

export default function LicenseEditor({ translation, onSave }: Props) {
  const [form, setForm] = useState<LicenseForm>(() => toLicenseForm(translation));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof LicenseForm>(key: K, value: LicenseForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(fromLicenseForm(form));
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the license record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bible-license-editor">
      <div className="bible-editor-grid">
        <label className="bible-field">
          <span>License basis</span>
          <select value={form.basis} onChange={(e) => set('basis', e.target.value as BibleLicenseBasis)}>
            {BASIS_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {BASIS_LABEL[b]}
              </option>
            ))}
          </select>
          <span className="muted-note">{BASIS_HELP[form.basis]}</span>
        </label>

        <label className="bible-field">
          <span>Rights holder</span>
          <input
            type="text"
            value={form.rightsHolder}
            placeholder="Deutsche Bibelgesellschaft — leave empty for a public-domain text"
            onChange={(e) => set('rightsHolder', e.target.value)}
          />
        </label>
      </div>

      <label className="bible-field">
        <span>Notice, rendered verbatim</span>
        <textarea
          rows={3}
          value={form.notice}
          placeholder="The exact wording the license requires wherever this text is shown."
          onChange={(e) => set('notice', e.target.value)}
        />
        <span className="muted-note">
          Shown under every chapter and beside both columns of the parallel view. Several licenses require the exact
          wording — do not reformat, shorten or translate it.
        </span>
      </label>

      <label className="bible-field">
        <span>Provenance</span>
        <textarea
          rows={2}
          value={form.provenance}
          placeholder="Public domain. Text prepared from the 1912 revision…"
          onChange={(e) => set('provenance', e.target.value)}
        />
        <span className="muted-note">
          Courtesy line for public-domain texts: where this copy came from. Not a legal requirement, but the answer to
          “is this the text it says it is?”.
        </span>
      </label>

      <div className="bible-editor-grid">
        <label className="bible-field">
          <span>Permission reference</span>
          <input
            type="text"
            value={form.permissionRef}
            placeholder="Email thread, contract number — whatever proves it"
            onChange={(e) => set('permissionRef', e.target.value)}
          />
        </label>
        <label className="bible-field">
          <span>Permission date</span>
          <input type="date" value={form.permissionDate} onChange={(e) => set('permissionDate', e.target.value)} />
        </label>
      </div>

      <fieldset className="bible-gates">
        <legend className="config-label">What we may do with this text</legend>
        {GATES.map((gate) => (
          <label key={gate.key} className="bible-gate">
            <input type="checkbox" checked={form[gate.key]} onChange={(e) => set(gate.key, e.target.checked)} />
            <span className="bible-gate-label">
              {gate.label}
              <span className={gate.where === 'api' ? 'pd-badge pd-info' : 'pd-badge pd-warn'}>
                {gate.where === 'api' ? 'Enforced by the API' : 'Enforced by the site UI'}
              </span>
            </span>
            <span className="muted-note">{gate.note}</span>
          </label>
        ))}

        <label className="bible-field bible-cap">
          <span>Maximum verses per request</span>
          <input
            type="number"
            min={1}
            value={form.maxVersesPerRequest}
            placeholder="Empty — uncapped"
            onChange={(e) => set('maxVersesPerRequest', e.target.value)}
          />
          <span className="muted-note">
            Enforced by the API: a chapter or parallel response stops at the cap and comes back marked
            <code> truncated</code>, so the reader can say the passage was cut rather than ending silently. Empty means
            uncapped.
          </span>
        </label>
      </fieldset>

      {error && <p className="flash-err">{error}</p>}

      <div className="bible-editor-actions">
        <button className="btn-primary btn-sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save license record'}
        </button>
        {dirty && <span className="muted-note">Unsaved changes in this record.</span>}
      </div>
    </div>
  );
}
