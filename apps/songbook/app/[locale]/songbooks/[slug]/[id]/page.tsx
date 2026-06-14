import { notFound } from 'next/navigation';
import { fetchSong, fetchSongbook, fetchSongs } from '@/app/lib/api';
import ReaderLayout from '@/app/components/ReaderLayout';
import ProjectorOnly from '@/app/components/ProjectorOnly';

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ projector?: string }>;
}) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const [song, songbook, initialSongs] = await Promise.all([
    fetchSong(id),
    fetchSongbook(slug),
    fetchSongs(slug, { limit: 50, offset: 0 }),
  ]);
  if (!song || !songbook) notFound();
  if (sp.projector === '1') {
    return <ProjectorOnly song={song} />;
  }
  return (
    <div className="reader-wrap">
      <ReaderLayout
        songbook={songbook}
        song={song}
        initialSongs={initialSongs}
        slug={slug}
        apiUrl={process.env.API_URL}
      />
    </div>
  );
}
