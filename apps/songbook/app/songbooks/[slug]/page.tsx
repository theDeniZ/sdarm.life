import { notFound } from 'next/navigation';
import { fetchSongbook, fetchSongs } from '@/app/lib/api';
import SongListClient from '@/app/components/SongListClient';

export const runtime = 'edge';

export default async function SongbookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [songbook, initial] = await Promise.all([fetchSongbook(slug), fetchSongs(slug, { limit: 50, offset: 0 })]);
  if (!songbook) notFound();

  return (
    <main className="page">
      <SongListClient songbook={songbook} initial={initial} />
    </main>
  );
}
