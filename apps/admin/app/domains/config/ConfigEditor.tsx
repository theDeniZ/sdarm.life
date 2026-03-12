'use client';

import { useEffect, useRef, useState } from 'react';
import { type ConfigKey } from '@sdarm/db';
import ImagePicker from '../images/ImagePicker';
import { fetchConfig, saveConfigKey } from './repository';

const LABELS: Record<ConfigKey, string> = {
  donation_url:    'Donation link',
  hero_bg_key:     'Hero background image',
  hero_bg_alt:     'Hero background image alt text',
  about_text_1:    'About paragraph 1',
  about_text_2:    'About paragraph 2',
  about_image_key: 'About image',
  about_image_alt: 'About image alt text',
  about_link_url:  'About "learn more" URL',
  facebook_url:    'Facebook',
  whatsapp_url:    'WhatsApp',
  instagram_url:   'Instagram',
  youtube_url:     'YouTube',
};

const SECTIONS: { label: string; keys: ConfigKey[] }[] = [
  { label: 'General', keys: ['hero_bg_key', 'hero_bg_alt', 'donation_url'] },
  { label: 'About',   keys: ['about_text_1', 'about_text_2', 'about_image_key', 'about_image_alt', 'about_link_url'] },
  { label: 'Footer',  keys: ['facebook_url', 'whatsapp_url', 'instagram_url', 'youtube_url'] },
];

const TEXTAREA_KEYS: ConfigKey[] = ['about_text_1', 'about_text_2'];
const IMAGE_KEYS:    ConfigKey[] = ['about_image_key', 'hero_bg_key'];
const URL_KEYS:      ConfigKey[] = ['donation_url', 'about_link_url', 'facebook_url', 'whatsapp_url', 'instagram_url', 'youtube_url'];

type Flash = 'ok' | 'err' | null;

function ConfigField({ configKey, initialValue }: { configKey: ConfigKey; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [flash, setFlash] = useState<Flash>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(val: string) {
    try {
      await saveConfigKey(configKey, val);
      setFlash('ok');
    } catch {
      setFlash('err');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 2000);
  }

  const cardHeader = (
    <div className="config-card-header">
      <span className="config-label">{LABELS[configKey]}</span>
    </div>
  );

  if (IMAGE_KEYS.includes(configKey)) {
    return (
      <div className="config-card">
        {cardHeader}
        <ImagePicker
          value={value || null}
          onChange={(key) => { setValue(key ?? ''); save(key ?? ''); }}
        />
        {flash === 'ok'  && <div className="save-flash">✓ saved</div>}
        {flash === 'err' && <div className="save-flash" style={{ color: 'var(--red)' }}>Save failed</div>}
      </div>
    );
  }

  if (TEXTAREA_KEYS.includes(configKey)) {
    return (
      <div className="config-card">
        {cardHeader}
        <textarea
          className="config-textarea"
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => save(e.target.value)}
        />
        {flash === 'ok'  && <div className="save-flash">✓ saved</div>}
        {flash === 'err' && <div className="save-flash" style={{ color: 'var(--red)' }}>Save failed</div>}
      </div>
    );
  }

  return (
    <div className="config-card">
      {cardHeader}
      <input
        className="config-input"
        type={URL_KEYS.includes(configKey) ? 'url' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => save(e.target.value)}
      />
      {flash === 'ok'  && <div className="save-flash">✓ saved</div>}
      {flash === 'err' && <div className="save-flash" style={{ color: 'var(--red)' }}>Save failed</div>}
    </div>
  );
}

export default function ConfigEditor() {
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetchConfig()
      .then((cfg) => setValues(cfg as Record<string, string>))
      .catch((e) => setError(String(e)));
  }, []);

  if (error)   return <div className="state-error">{error}</div>;
  if (!values) return <div className="state-loading">Loading…</div>;

  return (
    <div className="config-sections">
      {SECTIONS.map((section) => (
        <div key={section.label} className="config-section">
          <h2 className="config-section-title">{section.label}</h2>
          <div className="config-grid">
            {section.keys.map((key) => (
              <ConfigField key={key} configKey={key} initialValue={values[key] ?? ''} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
