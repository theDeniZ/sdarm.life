'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { SongDto } from '@sdarm/types';
import { hasChords } from '@/app/lib/chords';
import SongReader from './SongReader';
import Projector from './Projector';
import SheetViewer from './SheetViewer';
import PresenterDashboard from './PresenterDashboard';

type Mode = 'reader' | 'fullscreen' | 'presenter' | 'sheets';

export default function SongView({ song }: { song: SongDto }) {
  const t = useTranslations('songbook.view');
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>('reader');
  const [showChords, setShowChords] = useState(false);
  const [multiScreen, setMultiScreen] = useState(false);
  const displayWinRef = useRef<Window | null>(null);
  const anyChords = song.parts.some((p) => p.lyrics.split('\n').some(hasChords));

  useEffect(() => {
    setMultiScreen(!!(window.screen as Screen & { isExtended?: boolean }).isExtended);
  }, []);

  async function openPresenter() {
    let features = `width=${screen.availWidth},height=${screen.availHeight},left=${(screen as Screen & { availLeft?: number }).availLeft ?? 0},top=${(screen as Screen & { availTop?: number }).availTop ?? 0}`;
    try {
      type ScreenInfo = {
        availLeft: number;
        availTop: number;
        availWidth: number;
        availHeight: number;
        isPrimary: boolean;
      };
      const details = await (
        window as Window & { getScreenDetails?: () => Promise<{ screens: ScreenInfo[] }> }
      ).getScreenDetails?.();
      const external = details?.screens.find((s) => !s.isPrimary) ?? details?.screens[0];
      if (external) {
        features = `width=${external.availWidth},height=${external.availHeight},left=${external.availLeft},top=${external.availTop}`;
      }
    } catch {
      // fall back to current screen dimensions
    }
    const win = window.open(
      `/${locale}/songbooks/${song.songbook.slug}/${song.id}?projector=1`,
      'projector-display',
      features
    );
    displayWinRef.current = win;
    setMode('presenter');
  }

  function closePresenter() {
    displayWinRef.current?.close();
    displayWinRef.current = null;
    setMode('reader');
  }

  return (
    <div className="song-view">
      <div className="song-header">
        <h1 className="song-header__title">
          <span className="song-header__num">{song.number}</span> {song.title}
        </h1>
        {(song.author || song.copyright) && (
          <div className="song-header__meta">{[song.author, song.copyright].filter(Boolean).join(' · ')}</div>
        )}
      </div>

      <div className="mode-bar">
        <button className={`mode-btn${mode === 'reader' ? ' active' : ''}`} onClick={() => setMode('reader')}>
          {t('reader')}
        </button>
        {anyChords && mode === 'reader' && (
          <button className={`mode-btn${showChords ? ' active' : ''}`} onClick={() => setShowChords((v) => !v)}>
            {t('chords')}
          </button>
        )}
        <button className={`mode-btn${mode === 'fullscreen' ? ' active' : ''}`} onClick={() => setMode('fullscreen')}>
          {t('fullscreen')}
        </button>
        {multiScreen && (
          <button className={`mode-btn${mode === 'presenter' ? ' active' : ''}`} onClick={openPresenter}>
            {t('presenter')}
          </button>
        )}
        {song.sheets.length > 0 && (
          <button className={`mode-btn${mode === 'sheets' ? ' active' : ''}`} onClick={() => setMode('sheets')}>
            {t('sheetMusic')}
          </button>
        )}
      </div>

      {mode === 'reader' && <SongReader parts={song.parts} showChords={showChords} songId={song.id} />}
      {mode === 'fullscreen' && <Projector song={song} onClose={() => setMode('reader')} />}
      {mode === 'presenter' && <PresenterDashboard song={song} onClose={closePresenter} />}
      {mode === 'sheets' && <SheetViewer sheets={song.sheets} />}
    </div>
  );
}
