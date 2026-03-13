'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchSongbooks, deleteSongbook } from './repository';
import { r2url } from '../../lib/api';
import type { SongbookDto } from '@sdarm/types';

export default function SongbookList() {
  const [items, setItems] = useState<SongbookDto[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetchSongbooks()
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(book: SongbookDto) {
    if (!confirm(`Delete "${book.title}"? This will also delete all its songs.`)) return;
    await deleteSongbook(book.id);
    load();
  }

  if (loading) return <div className="state-loading">Loading…</div>;
  if (items.length === 0) return <div className="state-empty">No songbooks yet.</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cover</th>
            <th>Title</th>
            <th>Language</th>
            <th>Songs</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((book) => (
            <tr key={book.id}>
              <td>
                {book.coverKey ? (
                  <Image
                    className="td-thumb"
                    src={r2url(book.coverKey)!}
                    alt={book.title}
                    width={40}
                    height={40}
                    unoptimized
                  />
                ) : (
                  <div className="td-thumb" />
                )}
              </td>
              <td>
                <div className="td-title">{book.title}</div>
                <div className="td-slug">{book.slug}</div>
              </td>
              <td>{book.language}</td>
              <td>
                <Link href={`/songbooks/${book.id}/songs`} className="btn-ghost">
                  Songs ({book.songCount})
                </Link>
              </td>
              <td>
                <div className="td-actions">
                  <Link href={`/songbooks/${book.id}`} className="btn-ghost">
                    Edit
                  </Link>
                  <button className="btn-danger" onClick={() => handleDelete(book)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
