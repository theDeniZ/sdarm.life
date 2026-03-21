'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import type { SongbookDto, SongListItemDto, ListResponse } from '@sdarm/types';
import { fetchSongs } from '@/app/lib/api';

const LIMIT = 50;

interface Props {
  songbook: SongbookDto;
  initial: ListResponse<SongListItemDto>;
}

export default function SongListClient({ songbook, initial }: Props) {
  const t = useTranslations('songbook.reader');
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the first render — we already have initial data from the server
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetchSongs(songbook.slug, { q: q || undefined, limit: LIMIT, offset: (page - 1) * LIMIT }).then(
        ({ items, total }) => {
          setItems(items);
          setTotal(total);
          setLoading(false);
        }
      );
    }, 200);
  }, [q, page, songbook.slug]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <>
      <div className="song-list-header">
        <h1>{songbook.title}</h1>
        <input
          className="search-input"
          type="search"
          placeholder={t('searchByNumberOrTitle')}
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
      </div>

      <table className="song-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('title')}</th>
            <th>{t('author')}</th>
          </tr>
        </thead>
        <tbody style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.1s' }}>
          {items.map((song) => (
            <tr
              key={song.id}
              className="song-row"
              onClick={() => router.push(`/${locale}/songbooks/${songbook.slug}/${song.id}`)}
            >
              <td className="song-row__num">{song.number}</td>
              <td className="song-row__title">{song.title}</td>
              <td className="song-row__author">{song.author ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {pages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            ←
          </button>
          <span>
            {page} / {pages} ({total})
          </span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>
            →
          </button>
        </div>
      )}
    </>
  );
}
