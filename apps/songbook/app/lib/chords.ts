export interface Token {
  chord: string | null;
  word: string;
}

const CHORD_RE = /\[[A-H][^\]]*\]/;
const CHORD_TOKEN_RE = /(\[([A-H][^\]]*)\])?([^[]*)/;

// Parses "[G]Amazing [C]grace how [D]sweet" into Token[]
// Segments without a preceding chord get chord: null
export function parseChords(line: string): Token[] {
  const tokens: Token[] = [];
  // Match optional [CHORD] followed by text up to the next [ or end
  const re = new RegExp(CHORD_TOKEN_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    if (match.index === line.length) break;
    const chord = match[2] ?? null;
    const word = match[3];
    if (chord !== null || word) {
      tokens.push({ chord, word });
    }
  }
  return tokens;
}

export function hasChords(line: string): boolean {
  return CHORD_RE.test(line);
}

export function stripChords(line: string): string {
  return line.replace(new RegExp(CHORD_RE.source, 'g'), '');
}

// ── TRANSPOSITION ────────────────────────────────────────────────────────────

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Map flat spellings to their sharp enharmonic equivalents
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cb: 'B',
};

// Map sharp results that are conventionally written as flats
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
};

// Return true if the chord root was originally written with a flat
function usedFlat(root: string): boolean {
  return root.endsWith('b') && root !== 'B';
}

// Transpose a single chord name (e.g. "Am7", "F#", "Bbsus4") by semitones.
// The suffix (m, 7, maj7, sus4, …) is preserved unchanged.
export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;

  // Extract root: letter + optional accidental (#, b — but not 'B' the note)
  const rootMatch = chord.match(/^[A-H][#b]?/);
  if (!rootMatch) return chord;

  const rawRoot = rootMatch[0];
  const suffix = chord.slice(rawRoot.length);
  const wasFlat = usedFlat(rawRoot);

  // Normalize to sharp spelling
  const sharpRoot = FLAT_TO_SHARP[rawRoot] ?? rawRoot;

  const idx = SHARPS.indexOf(sharpRoot);
  if (idx === -1) return chord; // unknown root, leave unchanged

  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  let newRoot = SHARPS[newIdx];

  // Preserve flat/sharp preference: if the original used a flat,
  // convert the result to flat spelling when a conventional flat exists.
  if (wasFlat && SHARP_TO_FLAT[newRoot]) {
    newRoot = SHARP_TO_FLAT[newRoot];
  }

  return newRoot + suffix;
}

// Replace every [Chord] token in a lyrics line, transposing by semitones.
export function transposeLine(line: string, semitones: number): string {
  if (semitones === 0) return line;
  return line.replace(/\[([A-H][^\]]*)\]/g, (_, chord) => `[${transposeChord(chord, semitones)}]`);
}

// Detect the tonic of a song by picking the most common root note across all parts.
// Returns null if no chords are present.
export function detectKey(parts: { lyrics: string }[]): string | null {
  const counts: Record<string, number> = {};
  for (const part of parts) {
    for (const line of part.lyrics.split('\n')) {
      const matches = line.matchAll(/\[([A-H][#b]?)[^\]]*\]/g);
      for (const m of matches) {
        const root = m[1];
        counts[root] = (counts[root] ?? 0) + 1;
      }
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [root, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = root;
    }
  }
  return best;
}
