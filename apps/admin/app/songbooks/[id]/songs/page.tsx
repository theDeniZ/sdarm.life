import { fetchSongbooks } from '../../../domains/songbooks/repository';
import SongList from '../../../domains/songbooks/SongList';
import Link from 'next/link';

export const runtime = 'edge';

export default async function SongsPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const books = await fetchSongbooks();
  const book = books.find((b) => b.id === id);

  if (!book) return <div className="state-error">Songbook not found.</div>;

  return (
    <>
      <div className="page-header">
        <h1>{book.title}</h1>
        <Link href={`/songbooks/${id}`} className="btn-ghost">
          Edit songbook
        </Link>
      </div>
      <SongList songbookId={book.id} songbookSlug={book.slug} />
    </>
  );
}
