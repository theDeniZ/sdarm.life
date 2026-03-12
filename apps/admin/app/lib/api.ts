export const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';
export const R2 = process.env.NEXT_PUBLIC_R2_URL ?? 'https://images.sdarm.life';

export function adminHeaders(): HeadersInit {
  return {
    'CF-Access-Client-Id': process.env.NEXT_PUBLIC_CF_CLIENT_ID ?? '',
    'CF-Access-Client-Secret': process.env.NEXT_PUBLIC_CF_CLIENT_SECRET ?? '',
  };
}

export function r2url(key: string | null): string | null {
  return key ? `${R2}/${key}` : null;
}
