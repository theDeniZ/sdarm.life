import { fetchSongbooks } from '../../domains/songbooks/repository';
import SongbookForm from '../../domains/songbooks/SongbookForm';
import Link from 'next/link';

export default async function EditSongbookPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const books = await fetchSongbooks();
  const book = books.find((b) => b.id === id);

  if (!book) return <div className="state-error">Songbook not found.</div>;

  return (
    <>
      <div className="page-header">
        <h1>Edit: {book.title}</h1>
        <Link href={`/songbooks/${id}/songs`} className="btn-ghost">
          Songs ({book.songCount})
        </Link>
      </div>
      <SongbookForm
        id={id}
        initial={{
          title: book.title,
          slug: book.slug,
          language: book.language,
          description: book.description,
          coverKey: book.coverKey,
          sortOrder: book.sortOrder,
        }}
      />
    </>
  );
}
