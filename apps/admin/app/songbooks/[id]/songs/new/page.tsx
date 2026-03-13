export const runtime = 'edge';

import { fetchSongbooks } from '../../../../domains/songbooks/repository';
import SongForm from '../../../../domains/songbooks/SongForm';

export default async function NewSongPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const books = await fetchSongbooks();
  const book = books.find((b) => b.id === id);

  if (!book) return <div className="state-error">Songbook not found.</div>;

  return (
    <>
      <div className="page-header">
        <h1>New Song — {book.title}</h1>
      </div>
      <SongForm songbookId={id} />
    </>
  );
}
