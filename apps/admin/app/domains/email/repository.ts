import { API, adminHeaders } from '../../lib/api';
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
