import type { Metadata } from 'next';
import './globals.css';
import BgCanvas from './components/BgCanvas';

export const metadata: Metadata = {
  title: 'sdarm.life',
  description: 'Siebenten-Tags-Adventisten Reformationsbewegung in Deutschland',
};

const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
const R2 = process.env.R2_URL ?? 'https://images.sdarm.life';

const FALLBACK_BG = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1600&q=85&fit=crop';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let bgImageUrl: string = FALLBACK_BG;

  try {
    const res = await fetch(`${API}/config`, { cache: 'no-store' });
    if (res.ok) {
      const config = (await res.json()) as Record<string, string | null>;
      const key = config.hero_bg_key;
      if (key) bgImageUrl = `${R2}/${key}`;
    }
  } catch {
    // fall through to FALLBACK_BG
  }

  return (
    <html lang="de">
      <body>
        <BgCanvas bgImageUrl={bgImageUrl} />
        {children}
      </body>
    </html>
  );
}
