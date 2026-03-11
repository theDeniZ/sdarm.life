'use client';

import { useEffect, useRef, useState } from 'react';
import { KNOWN_CONFIG_KEYS, type ConfigKey } from '@sdarm/db';
import ImageUpload from './ImageUpload';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';

function adminHeaders(): HeadersInit {
  return {
    'CF-Access-Client-Id': process.env.NEXT_PUBLIC_CF_CLIENT_ID ?? '',
    'CF-Access-Client-Secret': process.env.NEXT_PUBLIC_CF_CLIENT_SECRET ?? '',
  };
}

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

const TEXTAREA_KEYS: ConfigKey[] = ['about_text_1', 'about_text_2'];
const IMAGE_KEYS:    ConfigKey[] = ['about_image_key', 'hero_bg_key'];
const URL_KEYS:      ConfigKey[] = [
  'donation_url', 'about_link_url', 'facebook_url',
  'whatsapp_url', 'instagram_url', 'youtube_url',
];

type Flash = 'ok' | 'err' | null;

function ConfigField({ configKey, initialValue }: { configKey: ConfigKey; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [flash, setFlash] = useState<Flash>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(val: string) {
    try {
      const res = await fetch(`${API}/api/v1/admin/config/${configKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ value: val || null }),
      });
      setFlash(res.ok ? 'ok' : 'err');
    } catch {
      setFlash('err');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 2000);
  }

  if (IMAGE_KEYS.includes(configKey)) {
    return (
      <div className="config-card">
        <div className="config-label">{LABELS[configKey]}</div>
        <ImageUpload
          value={value || null}
          onChange={(key) => { setValue(key); save(key); }}
        />
        {flash === 'ok'  && <div className="save-flash">✓ saved</div>}
        {flash === 'err' && <div className="save-flash" style={{ color: 'var(--red)' }}>Save failed</div>}
      </div>
    );
  }

  if (TEXTAREA_KEYS.includes(configKey)) {
    return (
      <div className="config-card">
        <div className="config-label">{LABELS[configKey]}</div>
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
      <div className="config-label">{LABELS[configKey]}</div>
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/v1/config`)
      .then((r) => r.json() as Promise<Record<string, string>>)
      .then(setValues)
      .catch((e) => setError(String(e)));
  }, []);

  if (error)   return <div className="state-error">{error}</div>;
  if (!values) return <div className="state-loading">Loading…</div>;

  return (
    <div className="config-grid">
      {KNOWN_CONFIG_KEYS.map((key) => (
        <ConfigField
          key={key}
          configKey={key}
          initialValue={values[key] ?? ''}
        />
      ))}
    </div>
  );
}
