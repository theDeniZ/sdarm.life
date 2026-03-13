import type { Metadata } from 'next';
import './globals.css';
import { fetchSongbooks } from './lib/api';
import SongbookNav from './components/SongbookNav';

export const metadata: Metadata = {
  title: 'Songbooks — SDARM',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const songbooks = await fetchSongbooks();

  return (
    <html lang="ru">
      <body>
        <SongbookNav songbooks={songbooks} />
        {children}
      </body>
    </html>
  );
}
