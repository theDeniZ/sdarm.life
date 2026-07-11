'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SongbookForm from '../../domains/songbooks/SongbookForm';
import { fetchSongbooks } from '../../domains/songbooks/repository';
import type { SongbookDto } from '@sdarm/types';

export default function EditSongbookPage() {
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
        <h1>Edit: {book.title}</h1>
        <Link href={`/songbooks/${songbookId}/songs`} className="btn-ghost">
          Songs ({book.songCount})
        </Link>
      </div>
      <SongbookForm
        id={songbookId}
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
