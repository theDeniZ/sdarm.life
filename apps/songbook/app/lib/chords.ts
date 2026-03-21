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
