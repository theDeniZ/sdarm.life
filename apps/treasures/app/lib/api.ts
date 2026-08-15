export const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
// R2 is referenced from client components (TreasureCard, MiniBookCard, etc.).
// process.env.R2_URL is server-only in Next.js, so without NEXT_PUBLIC_ the
// browser bundle would always fall back to the production URL and 404 in dev.
export const R2 = process.env.NEXT_PUBLIC_R2_URL ?? process.env.R2_URL ?? 'https://images.sdarm.life';

const TRANSFORMS_ENABLED = process.env.R2_TRANSFORMS !== 'false';

export interface ImageTransform {
  w?: number;
  h?: number;
  q?: number;
}

export function r2url(key: string | null, opts?: ImageTransform): string | null {
  if (!key) return null;
  const base = `${R2}/${key}`;
  if (!opts || !TRANSFORMS_ENABLED || R2.includes('localhost')) return base;
  const params = [opts.w && `w=${opts.w}`, opts.h && `h=${opts.h}`, `f=auto`, `q=${opts.q ?? 80}`]
    .filter(Boolean)
    .join(',');
  return `${R2}/cdn-cgi/image/${params}/${key}`;
}

export type TreasureType = 'book';

export interface Treasure {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  type: TreasureType;
  language: string;
  coverGradient: string | null;
  coverAccentColor: string | null;
  coverKey: string | null;
  isFree: boolean;
  price: string | null;
  sortOrder: number;
  epubUrl: string | null;
  epubKey: string | null;
}

export async function fetchTreasureById(id: number): Promise<Treasure | null> {
  try {
    const res = await fetch(`${API}/treasures/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Treasure;
  } catch {
    return null;
  }
}

export async function fetchTreasures(opts?: { language?: string }): Promise<Treasure[]> {
  try {
    const params = new URLSearchParams({ limit: '200' });
    if (opts?.language) params.set('language', opts.language);
    const res = await fetch(`${API}/treasures?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: Treasure[] };
    return data.items;
  } catch {
    return [];
  }
}
