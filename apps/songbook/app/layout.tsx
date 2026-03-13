import type { Metadata } from 'next';
import './globals.css';
import { fetchSongbooks } from './lib/api';
import SongbookNav from './components/SongbookNav';

export const metadata: Metadata = {
  title: 'Liederbuch — SDARM',
  description: 'Siebenten-Tags-Adventisten Reformationsbewegung — Liederbuch',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const songbooks = await fetchSongbooks();
  const webUrl = process.env.WEB_URL ?? 'https://sdarm.life';

  return (
    <html lang="de">
      <body>
        <SongbookNav songbooks={songbooks} webUrl={webUrl} />
        {children}
      </body>
    </html>
  );
}
