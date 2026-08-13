'use client';

import { useState } from 'react';
import Link from 'next/link';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import { usePaginatedList } from '../../lib/hooks';
import { fetchSongs, deleteSong, SONG_LIMIT } from './repository';
import type { SongListItemDto } from '@sdarm/types';

type Props = {
  songbookId: number;
  songbookSlug: string;
};

export default function SongList({ songbookId, songbookSlug }: Props) {
  const [q, setQ] = useState('');
  const [pendingDelete, setPendingDelete] = useState<SongListItemDto | null>(null);

  const { items, total, page, loading, setPage, reload } = usePaginatedList<SongListItemDto>(
    (p) => fetchSongs(songbookSlug, p, q || undefined),
    [q]
  );

  async function handleDelete() {
    if (!pendingDelete) return;
    await deleteSong(pendingDelete.id);
    setPendingDelete(null);
    reload();
  }

  return (
    <>
      <div className="filter-bar">
        <input
          type="search"
          className="filter-input"
          placeholder="Search by number or title…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <Link href={`/songbooks/${songbookId}/songs/new`} className="btn-primary">
          + New song
        </Link>
      </div>

      {loading ? (
        <div className="state-loading">Loading…</div>
      ) : items.length === 0 ? (
        <div className="state-empty">No songs yet.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((song) => (
                  <tr key={song.id}>
                    <td style={{ width: 48, fontWeight: 600 }}>{song.number}</td>
                    <td>{song.title}</td>
                    <td>{song.author ?? '—'}</td>
                    <td>
                      <div className="td-actions">
                        <Link href={`/songs/${song.id}`} className="btn-ghost" aria-label={`Edit ${song.title}`}>
                          Edit
                        </Link>
                        <button
                          className="btn-danger"
                          aria-label={`Delete ${song.title}`}
                          onClick={() => setPendingDelete(song)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={SONG_LIMIT} onChange={setPage} />
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete song?"
          message={
            <>
              <b>{pendingDelete.title}</b> and all of its parts and sheet music will be permanently deleted. This cannot
              be undone.
            </>
          }
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
