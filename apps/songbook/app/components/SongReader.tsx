'use client';

import type { SongPartDto } from '@sdarm/types';
import { partLabel, expandParts } from '@/app/lib/format';
import ChordLine from './ChordLine';

export default function SongReader({ parts, showChords }: { parts: SongPartDto[]; showChords: boolean }) {
  const displayParts = expandParts(parts);

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
      <div style={{ height: '15vh' }} aria-hidden="true" />
    </div>
  );
}
