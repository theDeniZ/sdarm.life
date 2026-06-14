// Same-origin API proxy at /api/v1/* (hides API_KEY from browser).
// All admin API calls go through app/api/v1/[...path]/route.ts which injects the Bearer token server-side.
export const API = '';
export const R2 = process.env.NEXT_PUBLIC_R2_URL ?? 'https://images.sdarm.life';

export function adminHeaders(): HeadersInit {
  // Authorization is added by the server-side proxy — do not include it here.
  return {};
}

export function r2url(key: string | null): string | null {
  return key ? `${R2}/${key}` : null;
}
