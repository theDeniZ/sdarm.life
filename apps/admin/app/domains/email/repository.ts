import { API, adminHeaders } from '../../lib/api';
import type { DigestFrequency, DigestPreviewDto, DigestSettingsDto } from '@sdarm/types';
import type { EmailFormData } from './types';

export async function sendEmail(data: EmailFormData): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/email/send`, {
    method: 'POST',
    headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
}

// ── Subscriber digest (issue #184) ───────────────────────────────────────────

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchDigestSettings(): Promise<DigestSettingsDto> {
  return json(await fetch(`${API}/api/v1/admin/email/digest?_t=${Date.now()}`, { headers: adminHeaders() }));
}

export async function saveDigestSettings(data: {
  enabled: boolean;
  frequency: DigestFrequency;
  weekday: number;
}): Promise<DigestSettingsDto> {
  return json(
    await fetch(`${API}/api/v1/admin/email/digest`, {
      method: 'PUT',
      headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  );
}

export async function fetchDigestPreview(locale: 'de' | 'en', since?: string): Promise<DigestPreviewDto> {
  const q = new URLSearchParams({ locale, _t: String(Date.now()) });
  if (since) q.set('since', since);
  return json(await fetch(`${API}/api/v1/admin/email/digest/preview?${q}`, { headers: adminHeaders() }));
}

export async function sendDigestTest(to: string, locale: 'de' | 'en', since?: string): Promise<void> {
  await json(
    await fetch(`${API}/api/v1/admin/email/digest/test`, {
      method: 'POST',
      headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, locale, since }),
    })
  );
}
