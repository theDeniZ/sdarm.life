'use client';

import { useState } from 'react';
import type { SongDto } from '@sdarm/types';
import SongReader from './SongReader';
import Projector from './Projector';
import SheetViewer from './SheetViewer';

type Mode = 'reader' | 'projector' | 'sheets';

export default function SongView({ song }: { song: SongDto }) {
  const [mode, setMode] = useState<Mode>('reader');

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
          Reader
        </button>
        <button className={`mode-btn${mode === 'projector' ? ' active' : ''}`} onClick={() => setMode('projector')}>
          Projector
        </button>
        {song.sheets.length > 0 && (
          <button className={`mode-btn${mode === 'sheets' ? ' active' : ''}`} onClick={() => setMode('sheets')}>
            Sheet music
          </button>
        )}
      </div>

      {mode === 'reader' && <SongReader parts={song.parts} />}
      {mode === 'projector' && <Projector song={song} onClose={() => setMode('reader')} />}
      {mode === 'sheets' && <SheetViewer sheets={song.sheets} />}
    </div>
  );
}
