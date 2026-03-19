export const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';
export const R2 = process.env.NEXT_PUBLIC_R2_URL ?? 'https://images.sdarm.life';

export function adminHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY ?? ''}`,
  };
}

export function r2url(key: string | null): string | null {
  return key ? `${R2}/${key}` : null;
}
