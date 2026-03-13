import { parseChords, hasChords } from '@/app/lib/chords';

interface Props {
  line: string;
  showChords: boolean;
}

export default function ChordLine({ line, showChords }: Props) {
  if (!hasChords(line) || !showChords) {
    // Plain line — no chord markup needed
    return <div>{line || '\u00A0'}</div>;
  }

  const tokens = parseChords(line);

  return (
    <div className="chord-line">
      {tokens.map((t, i) => (
        <span key={i} className="chord-token">
          <span className="chord-token__chord">{t.chord ?? ''}</span>
          <span className="chord-token__word">{t.word || ''}</span>
        </span>
      ))}
    </div>
  );
}
