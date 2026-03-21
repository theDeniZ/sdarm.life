'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SongDto } from '@sdarm/types';
import { hasChords } from '@/app/lib/chords';
import SongReader from './SongReader';
import Projector from './Projector';
import SheetViewer from './SheetViewer';

type Mode = 'reader' | 'projector' | 'sheets';

export default function SongView({ song }: { song: SongDto }) {
  const t = useTranslations('songbook.view');
  const [mode, setMode] = useState<Mode>('reader');
  const [showChords, setShowChords] = useState(false);
  const anyChords = song.parts.some((p) => p.lyrics.split('\n').some(hasChords));

  return (
    <div className="song-view">
      <div className="song-header">
        <div className="song-header__num">#{song.number}</div>
        <h1 className="song-header__title">{song.title}</h1>
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
        <button className={`mode-btn${mode === 'projector' ? ' active' : ''}`} onClick={() => setMode('projector')}>
          {t('projector')}
        </button>
        {song.sheets.length > 0 && (
          <button className={`mode-btn${mode === 'sheets' ? ' active' : ''}`} onClick={() => setMode('sheets')}>
            {t('sheetMusic')}
          </button>
        )}
      </div>

      {mode === 'reader' && <SongReader parts={song.parts} showChords={showChords} />}
      {mode === 'projector' && <Projector song={song} onClose={() => setMode('reader')} />}
      {mode === 'sheets' && <SheetViewer sheets={song.sheets} />}
    </div>
  );
}
