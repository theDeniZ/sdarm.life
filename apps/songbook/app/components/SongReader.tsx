'use client';

import { useState } from 'react';
import type { SongPartDto } from '@sdarm/types';
import { partLabel, expandParts } from '@/app/lib/format';
import { hasChords } from '@/app/lib/chords';
import ChordLine from './ChordLine';

export default function SongReader({ parts }: { parts: SongPartDto[] }) {
  const [showChords, setShowChords] = useState(false);
  const displayParts = expandParts(parts);
  const anyChords = parts.some((p) => p.lyrics.split('\n').some(hasChords));

  return (
    <div className="reader">
      {displayParts.map((part, i) => (
        <div key={i} className="song-part">
          <div className="song-part__label">{partLabel(part.type, part.label)}</div>
          <div className="song-part__lyrics">
            {part.lyrics.split('\n').map((line, j) => (
              <ChordLine key={j} line={line} showChords={showChords} />
            ))}
          </div>
        </div>
      ))}
      {anyChords && (
        <div className="reader__toolbar">
          <button
            className={`reader__chord-btn${showChords ? ' on' : ''}`}
            onClick={() => setShowChords((v) => !v)}
          >
            Аккорды
          </button>
        </div>
      )}
    </div>
  );
}
