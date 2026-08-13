import Link from 'next/link';
import Image from 'next/image';
import { r2url } from '../../lib/api';
import type { SongbookDto } from '@sdarm/types';

type Props = {
  book: SongbookDto;
  onDelete: (book: SongbookDto) => void;
};

export default function SongbookCard({ book, onDelete }: Props) {
  const cover = r2url(book.coverKey);

  return (
    <div className="book-card">
      <div className="book-cover">
        {cover ? (
          <Image
            src={cover}
            alt={book.title}
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        ) : (
          <svg
            className="book-cover-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}
      </div>
      <div className="book-card-body">
        <div className="book-title-row">
          <span className="book-title" title={book.title}>
            {book.title}
          </span>
          <span className="chip">{book.language}</span>
        </div>
        <div className="book-meta">{book.songCount} songs</div>
        <div className="book-actions">
          <Link href={`/songbooks/${book.id}`} className="btn-ghost btn-sm" aria-label={`Edit ${book.title}`}>
            Edit
          </Link>
          <Link
            href={`/songbooks/${book.id}/songs`}
            className="btn-ghost btn-sm"
            aria-label={`Manage songs in ${book.title}`}
          >
            Songs
          </Link>
          <button className="btn-danger btn-sm" aria-label={`Delete ${book.title}`} onClick={() => onDelete(book)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
