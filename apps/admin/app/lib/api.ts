// API constant points to the admin app itself (same-origin). The `/api/v1/*`
// Next.js route handler server-side-proxies to sdarm-api and injects the bearer
// token there, so the secret never reaches the browser bundle.
export const API = '';
export const R2 = process.env.NEXT_PUBLIC_R2_URL ?? 'https://images.sdarm.life';

export function adminHeaders(): HeadersInit {
  // Authorization is added by the server-side proxy — do not include it here.
  return {};
}

export function r2url(key: string | null): string | null {
  return key ? `${R2}/${key}` : null;
}
