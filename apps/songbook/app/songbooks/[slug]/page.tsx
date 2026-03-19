import { notFound, redirect } from 'next/navigation';
import { fetchSongbook, fetchSongs } from '@/app/lib/api';

export const runtime = 'edge';

export default async function SongbookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [songbook, songs] = await Promise.all([fetchSongbook(slug), fetchSongs(slug, { limit: 1, offset: 0 })]);
  if (!songbook) notFound();
  if (songs.items.length === 0) notFound();
  redirect(`/songbooks/${slug}/${songs.items[0].id}`);
}
