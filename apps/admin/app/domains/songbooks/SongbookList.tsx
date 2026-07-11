'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ConfirmDialog from '../../components/ConfirmDialog';
import SongbookCard from './SongbookCard';
import { fetchSongbooks, deleteSongbook } from './repository';
import type { SongbookDto } from '@sdarm/types';

export default function SongbookList() {
  const [items, setItems] = useState<SongbookDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [language, setLanguage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SongbookDto | null>(null);

  function load() {
    setLoading(true);
    fetchSongbooks()
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const languages = useMemo(() => Array.from(new Set(items.map((b) => b.language))).sort(), [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((b) => {
      if (language && b.language !== language) return false;
      if (needle && !b.title.toLowerCase().includes(needle) && !b.slug.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, q, language]);

  async function handleDelete() {
    if (!pendingDelete) return;
    await deleteSongbook(pendingDelete.id);
    setPendingDelete(null);
    load();
  }

  if (loading) return <div className="state-loading">Loading…</div>;

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          className="filter-input"
          placeholder="Search by title or slug…"
          aria-label="Search songbooks by title or slug"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="chip-filter" aria-pressed={language === null} onClick={() => setLanguage(null)}>
          All
        </button>
        {languages.map((lang) => (
          <button key={lang} className="chip-filter" aria-pressed={language === lang} onClick={() => setLanguage(lang)}>
            {lang.toUpperCase()}
          </button>
        ))}
        <Link href="/songbooks/new" className="btn-primary" style={{ marginLeft: 'auto' }}>
          + New songbook
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="state-empty">
          {items.length === 0 ? 'No songbooks yet.' : 'No songbooks match your search.'}
        </div>
      ) : (
        <div className="book-grid">
          {filtered.map((book) => (
            <SongbookCard key={book.id} book={book} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete songbook?"
          message={
            <>
              <b>{pendingDelete.title}</b> and all of its songs, parts, and sheet music will be permanently deleted.
              This cannot be undone.
            </>
          }
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
