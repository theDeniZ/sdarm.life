'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchSongbooks } from '../../../../domains/songbooks/repository';
import SongForm from '../../../../domains/songbooks/SongForm';
import type { SongbookDto } from '@sdarm/types';

export default function NewSongPage() {
  const { id } = useParams<{ id: string }>();
  const songbookId = parseInt(id, 10);
  const [book, setBook] = useState<SongbookDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSongbooks()
      .then((books) => {
        const found = books.find((b) => b.id === songbookId);
        if (found) setBook(found);
        else setError('Songbook not found.');
      })
      .catch((e) => setError(String(e)));
  }, [songbookId]);

  if (error) return <div className="state-error">{error}</div>;
  if (!book) return <div className="state-loading">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <h1>New Song — {book.title}</h1>
      </div>
      <SongForm songbookId={songbookId} />
    </>
  );
}
