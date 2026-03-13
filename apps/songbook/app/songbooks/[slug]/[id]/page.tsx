import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchSong, fetchSongbook } from '@/app/lib/api';
import SongView from '@/app/components/SongView';

export const runtime = 'edge';

export default async function SongPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  // Fetch full SongDto (all parts + sheet metadata) and songbook in parallel — one request total
  const [song, songbook] = await Promise.all([fetchSong(id), fetchSongbook(slug)]);
  if (!song || !songbook) notFound();

  return (
    <main className="page">
      <Link href={`/songbooks/${slug}`} className="back-link">
        ← {songbook.title}
      </Link>
      {/* All parts already in song prop — SongView switches modes without any further requests */}
      <SongView song={song} />
    </main>
  );
}
