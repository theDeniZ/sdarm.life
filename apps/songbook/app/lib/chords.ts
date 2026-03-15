export interface Token {
  chord: string | null;
  word: string;
}

// Parses "[G]Amazing [C]grace how [D]sweet" into Token[]
// Segments without a preceding chord get chord: null
export function parseChords(line: string): Token[] {
  const tokens: Token[] = [];
  // Match optional [CHORD] followed by text up to the next [ or end
  const re = /(\[([A-G][^\]]*)\])?([^[]*)/g;
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
  return /\[[A-G][^\]]*\]/.test(line);
}

export function stripChords(line: string): string {
  return line.replace(/\[[A-G][^\]]*\]/g, '');
}
