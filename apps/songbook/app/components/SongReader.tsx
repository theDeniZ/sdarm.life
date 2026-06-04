'use client';

import { useState, useEffect } from 'react';
import type { SongPartDto } from '@sdarm/types';
import { partLabel, expandParts } from '@/app/lib/format';
import { transposeLine, detectKey, transposeChord } from '@/app/lib/chords';
import ChordLine from './ChordLine';

interface Props {
  parts: SongPartDto[];
  showChords: boolean;
  songId: number;
}

export default function SongReader({ parts, showChords, songId }: Props) {
  const [transpose, setTranspose] = useState(0);

  // Read persisted transposition on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`sdarm_transpose_${songId}`);
      if (stored !== null) {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n >= -11 && n <= 11) setTranspose(n);
      }
    } catch {
      // localStorage unavailable — ignore
    }
  }, [songId]);

  function changeTranspose(delta: number) {
    setTranspose((prev: number) => {
      const next = Math.max(-11, Math.min(11, prev + delta));
      try {
        localStorage.setItem(`sdarm_transpose_${songId}`, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function resetTranspose() {
    setTranspose(0);
    try {
      localStorage.removeItem(`sdarm_transpose_${songId}`);
    } catch {
      // ignore
    }
  }

  const displayParts = expandParts(parts);

  // Build transposed parts when transpose !== 0
  const renderedParts =
    transpose === 0
      ? displayParts
      : displayParts.map((p) => ({
          ...p,
          lyrics: p.lyrics
            .split('\n')
            .map((l: string) => transposeLine(l, transpose))
            .join('\n'),
        }));

  // Key indicator: detect original tonic and show transposed tonic
  const originalKey = showChords ? detectKey(parts) : null;
  const transposedKey = originalKey && transpose !== 0 ? transposeChord(originalKey, transpose) : null;

  return (
    <div className="reader">
      {showChords && (
        <div className="transpose-bar">
          <button
            className="transpose-btn"
            onClick={() => changeTranspose(-1)}
            aria-label="Transpose down one semitone"
          >
            −1
          </button>
          <span className="transpose-label">
            {transpose === 0 ? (
              <span className="transpose-offset">0</span>
            ) : transposedKey && originalKey ? (
              <>
                <span className="transpose-key">{originalKey}</span>
                <span className="transpose-arrow">→</span>
                <span className="transpose-key transpose-key--active">{transposedKey}</span>
              </>
            ) : (
              <span className="transpose-offset transpose-offset--active">
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>
            )}
          </span>
          <button className="transpose-btn" onClick={() => changeTranspose(1)} aria-label="Transpose up one semitone">
            +1
          </button>
          {transpose !== 0 && (
            <button
              className="transpose-btn transpose-btn--reset"
              onClick={resetTranspose}
              aria-label="Reset transposition"
            >
              ↺
            </button>
          )}
        </div>
      )}
      {renderedParts.map((part, i) => (
        <div key={i} className="song-part">
          <div className="song-part__label">{partLabel(part.type, part.label)}</div>
          <div className="song-part__lyrics">
            {part.lyrics.split('\n').map((line, j) => (
              <ChordLine key={j} line={line} showChords={showChords} />
            ))}
          </div>
        </div>
      ))}
      <div style={{ height: '15vh' }} aria-hidden="true" />
    </div>
  );
}
