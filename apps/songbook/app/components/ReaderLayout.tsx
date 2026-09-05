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
}

export default function ReaderLayout({ songbook, song: initialSong, initialSongs, slug, apiUrl }: Props) {
  const t = useTranslations('songbook.reader');
  const tSearch = useTranslations('songbook.search');
  const locale = useLocale();
  // Three states, not two. `null` means the reader has not chosen, and the
  // breakpoint decides: docked open on a wide screen, off-canvas closed below
  // DOCKED_FROM. Deriving that from `window` in the initial state would not
  // survive SSR, and defaulting to a boolean either flashes the list open on a
  // tablet or flashes it closed on a desktop. The class is simply absent until
  // the reader touches the toggle, so CSS owns the default and React owns intent.
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
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

  // The site navbar's height is not a constant: it measures 59px at 390, 63px at
  // 834 and 72px at 1024. `.reader-wrap` hardcoded 62px, so it was wrong at every
  // one of those widths, and the off-canvas list — position: fixed, top: 0 —
  // slid up underneath the navbar, putting the site logo (z-index 200) on top of
  // the list's own header (z-index 150). Measure it instead, the same way
  // SblApp does for the lesson sheet.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('nav.site-nav');
    if (!nav) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        '--reader-nav-h',
        `${Math.round(nav.getBoundingClientRect().height)}px`
      );
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Below this the list is an overlay over the song, not a column beside it.
  const DOCKED_FROM = '(min-width: 1101px)';
  const isDocked = () => window.matchMedia(DOCKED_FROM).matches;

  function toggleSidebar() {
    // With no explicit choice yet, flip whatever the breakpoint defaulted to.
    setSidebarOpen((open) => (open === null ? !isDocked() : !open));
  }

  function navigateTo(id: number) {
    // Picking a song is the moment the list has done its job — get it out of the
    // way. On a docked layout there is room for both, so it stays.
    if (!isDocked()) setSidebarOpen(false);
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
          onClick={toggleSidebar}
          aria-expanded={sidebarOpen ?? undefined}
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
        {/* Scrim — only rendered while the list is an overlay, so tapping the song
            closes the list instead of trapping the reader behind it. */}
        {sidebarOpen === true && (
          <div className="reader-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}

        {/* Sidebar. No class at all until the reader chooses — see the state above. */}
        <div
          className={`reader-sidebar${sidebarOpen === true ? ' is-open' : sidebarOpen === false ? ' is-closed' : ''}`}
        >
          <div className="reader-sidebar-inner">
            {/* No eyebrow, no title. The breadcrumb 44px above already reads
                "Lieder › Breezify › Кто же я", so the name was on screen twice,
                and an eyebrow saying "Songbook" over a songbook's name labels
                what needs no label. Only a real description survives. */}
            {songbook.description && (
              <div className="reader-sidebar-book">
                <div className="reader-sidebar-desc">{songbook.description}</div>
              </div>
            )}

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
            <SongView song={currentSong} />
          </div>
        </div>
      </div>
    </>
  );
}
