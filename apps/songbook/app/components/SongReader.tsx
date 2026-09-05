'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { SongPartDto } from '@sdarm/types';
import { expandParts } from '@/app/lib/format';
import { transposeLine, detectKey, transposeChord } from '@/app/lib/chords';
import ChordLine from './ChordLine';

interface Props {
  parts: SongPartDto[];
  showChords: boolean;
  songId: number;
}

type PartType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'coda';
const PART_TYPES: PartType[] = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'coda'];

export default function SongReader({ parts, showChords, songId }: Props) {
  const tParts = useTranslations('songbook.parts');
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

  // Labels come from the part's type, not from song_parts.label. The stored label
  // is whatever the bulk importer typed — "Куплет 1" in a Russian book, German in
  // a German one — so on a site that runs in de and en it produced a page with
  // "Куплет 1" over one part and "CHORUS" (the capitalised enum name) over the
  // next. Verses are numbered here, in render order, because expandParts()
  // repeats the chorus between them and the stored ordinal cannot be trusted.
  let verseNo = 0;
  const labelled = renderedParts.map((p) => {
    if (p.type === 'verse') verseNo += 1;
    const type = (PART_TYPES as readonly string[]).includes(p.type) ? (p.type as PartType) : null;
    const name = type ? tParts(type) : p.label;
    return { ...p, displayLabel: p.type === 'verse' ? `${name} ${verseNo}` : name };
  });

  // Key indicator: detect original tonic and show transposed tonic
  const originalKey = showChords ? detectKey(parts) : null;
  const transposedKey = originalKey && transpose !== 0 ? transposeChord(originalKey, transpose) : null;

  return (
    <div className="reader">
      {showChords && (
        <div className="transpose-bar">
          {/* One control with three parts, not three controls: the group is the
              capsule, the buttons only divide it. */}
          <div className="transpose-group">
            <button
              className="transpose-btn"
              onClick={() => changeTranspose(-1)}
              aria-label="Transpose down one semitone"
            >
              −
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
              +
            </button>
          </div>
          {transpose !== 0 && (
            <button className="transpose-reset" onClick={resetTranspose} aria-label="Reset transposition">
              ↺
            </button>
          )}
        </div>
      )}
      {labelled.map((part, i) => (
        <div key={i} className="song-part">
          <div className="song-part__label">{part.displayLabel}</div>
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
