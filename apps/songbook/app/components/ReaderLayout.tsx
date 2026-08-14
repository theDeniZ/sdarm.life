'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { SongbookDto, SongDto, SongListItemDto, ListResponse } from '@sdarm/types';
import { fetchSongs, fetchSong } from '@/app/lib/api';
import { highlightMatch } from '@/app/lib/highlight';
import SongView from './SongView';

const LIMIT = 2000;

interface Props {
  songbook: SongbookDto;
  song: SongDto;
  initialSongs: ListResponse<SongListItemDto>;
  slug: string;
  apiUrl?: string;
  forcePresenter?: boolean;
  projectorUrl?: string;
}

export default function ReaderLayout({
  songbook,
  song: initialSong,
  initialSongs,
  slug,
  apiUrl,
  forcePresenter,
  projectorUrl,
}: Props) {
  const t = useTranslations('songbook.reader');
  const tSearch = useTranslations('songbook.search');
  const locale = useLocale();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    setSidebarOpen(window.innerWidth > 700);
  }, []);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SongListItemDto[]>(initialSongs.items);
  const [total, setTotal] = useState(initialSongs.total);
  const [listLoading, setListLoading] = useState(false);
  const [currentSong, setCurrentSong] = useState<SongDto>(initialSong);
  const [songLoading, setSongLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setListLoading(true);
      fetchSongs(slug, { q: q || undefined, limit: LIMIT, offset: 0 }, apiUrl).then(({ items, total }) => {
        setItems(items);
        setTotal(total);
        setListLoading(false);
      });
    }, 200);
  }, [q, slug]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentSong.id]);

  function navigateTo(id: number) {
    if (window.matchMedia('(max-width: 700px)').matches) setSidebarOpen(false);
    if (id === currentSong.id) return;
    setSongLoading(true);
    window.history.pushState(null, '', `/${locale}/songbooks/${slug}/${id}`);
    fetchSong(String(id), apiUrl).then((s) => {
      if (s) setCurrentSong(s);
      setSongLoading(false);
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="reader-toolbar-bar">
        <button
          className={`reader-icon-btn${sidebarOpen ? ' active' : ''}`}
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={t('songListAria')}
        >
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
            <line x1="2" y1="4" x2="16" y2="4" />
            <line x1="2" y1="9" x2="11" y2="9" />
            <line x1="2" y1="14" x2="16" y2="14" />
          </svg>
        </button>
        <div className="reader-breadcrumb">
          <Link href={`/${locale}`} className="reader-breadcrumb__link">
            {t('songs')}
          </Link>
          <span className="reader-breadcrumb__sep">›</span>
          <Link href={`/${locale}/songbooks/${slug}`} className="reader-breadcrumb__link">
            {songbook.title}
          </Link>
          <span className="reader-breadcrumb__sep">›</span>
          <span className="reader-breadcrumb__current">{currentSong.title}</span>
        </div>
      </div>

      <div className="reader-body">
        {/* Sidebar */}
        <div className={`reader-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
          <div className="reader-sidebar-inner">
            <div className="reader-sidebar-book">
              <div className="reader-sidebar-eyebrow">{t('songbook')}</div>
              <div className="reader-sidebar-title">{songbook.title}</div>
              {songbook.description && <div className="reader-sidebar-desc">{songbook.description}</div>}
            </div>

            <div className="reader-sidebar-search">
              <input
                className="reader-sidebar-search-input"
                type="search"
                placeholder={t('searchPlaceholder')}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                }}
              />
            </div>

            <div className="reader-sidebar-toc-label">
              {t('songs')}
              {total > 0 ? ` (${total})` : ''}
            </div>

            <div className="reader-sidebar-toc" style={{ opacity: listLoading ? 0.4 : 1 }}>
              {items.map((s) => {
                const showHighlight = q.length > 0 && s.matchType === 'title';
                const showLyricsPill = q.length > 0 && s.matchType === 'lyrics';
                return (
                  <button
                    key={s.id}
                    ref={s.id === currentSong.id ? activeItemRef : null}
                    className={`reader-toc-item${s.id === currentSong.id ? ' active' : ''}`}
                    onClick={() => navigateTo(s.id)}
                  >
                    <span className="reader-toc-num">{s.number}</span>
                    <span className="reader-toc-name">
                      {showHighlight ? highlightMatch(s.title, q) : s.title}
                      {showLyricsPill && <span className="song-row__match-pill">{tSearch('lyricsMatch')}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main reading area — outer <main> is in layout.tsx */}
        <div className="reader-main">
          <div className={`reader-content${songLoading ? ' reader-content--loading' : ''}`}>
            <SongView song={currentSong} forcePresenter={forcePresenter} projectorUrl={projectorUrl} />
          </div>
        </div>
      </div>
    </>
  );
}
