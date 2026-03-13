import type { SongPartDto } from '@sdarm/types';
import { partLabel } from '@/app/lib/format';
import ChordLine from './ChordLine';

export default function SongReader({ parts }: { parts: SongPartDto[] }) {
  return (
    <div className="reader">
      {parts.map((part) => (
        <div key={part.id} className="song-part">
          <div className="song-part__label">{partLabel(part.type, part.label)}</div>
          <div className="song-part__lyrics">
            {part.lyrics.split('\n').map((line, i) => (
              <ChordLine key={i} line={line} showChords={true} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
