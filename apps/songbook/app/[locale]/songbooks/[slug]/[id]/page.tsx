import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchSong, fetchSongbook, fetchSongs, API } from '@/app/lib/api';
import ReaderLayout from '@/app/components/ReaderLayout';
import ProjectorOnly from '@/app/components/ProjectorOnly';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const song = await fetchSong(id);
  if (!song) return {};

  const ogImage = `${API}/og?type=song&id=${song.id}&locale=${locale}&v=${encodeURIComponent(song.updatedAt)}`;
  const description = `${song.songbook.title} · ${song.number}`;

  return {
    title: song.title,
    description,
    openGraph: {
      type: 'article',
      title: song.title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: song.title }],
    },
  };
}

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
