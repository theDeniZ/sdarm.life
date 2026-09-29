import type { SongPartDto } from '@sdarm/types';
import { stripChords } from './chords';
import { expandParts } from './format';

// Line-by-line projection (issue #61). Everything here is pure so the projector
// display and the presenter dashboard derive the same slides from the same
// state — the two windows only ever exchange positions and settings, never
// rendered text.

export type LinesPerSlide = 1 | 2;
export type TransitionStyle = 'slide' | 'fade';

type TaggedPart = Pick<SongPartDto, 'type' | 'lyrics' | 'language' | 'translationType'>;

const isTranslation = (p: TaggedPart) => p.translationType === 'singable' || p.translationType === 'reference';

/** A part's language: its own tag, or the songbook's when it carries none. */
export function partLanguage(part: TaggedPart, bookLanguage: string): string {
  return part.language || bookLanguage;
}

/** Every language a song's parts are in, the original text's language first. */
export function songLanguages(parts: TaggedPart[], bookLanguage: string): string[] {
  const originals = parts.filter((p) => !isTranslation(p));
  const langs: string[] = [];
  for (const p of [...originals, ...parts]) {
    const lang = partLanguage(p, bookLanguage);
    if (!langs.includes(lang)) langs.push(lang);
  }
  return langs.length > 0 ? langs : [bookLanguage];
}

/** The parts written in one language, in stored order. */
export function partsInLanguage<T extends TaggedPart>(parts: T[], lang: string, bookLanguage: string): T[] {
  return parts.filter((p) => partLanguage(p, bookLanguage) === lang);
}

/** Projectable lines of a part: chords removed, blank lines dropped. */
export function splitLines(lyrics: string): string[] {
  return lyrics
    .split('\n')
    .map((line) => stripChords(line).trim())
    .filter(Boolean);
}

export interface AlignedLine {
  text: string;
  /** The translation shown under `text` — usually one line, empty when none. */
  sub: string[];
}

/**
 * Pairs a part's lines with its translation's, line for line. Translations
 * are not always the same length; a surplus goes under the last line rather
 * than being dropped, so no translated text silently disappears.
 */
export function alignLines(primary: string[], secondary: string[]): AlignedLine[] {
  const lines = primary.map((text, i) => ({ text, sub: i < secondary.length ? [secondary[i]] : [] }));
  if (lines.length > 0 && secondary.length > primary.length) {
    lines[lines.length - 1].sub.push(...secondary.slice(primary.length));
  }
  return lines;
}

export interface LinePart {
  type: SongPartDto['type'];
  lines: AlignedLine[];
  /** `singable` sublines are shown at full size, `reference` ones small and dimmed. */
  subStyle: 'singable' | 'reference';
}

/**
 * The primary language's parts, each paired with its counterpart in the
 * secondary language and expanded exactly like the full-verse projector
 * (choruses repeated after every verse), so a part index means the same slide
 * in both modes.
 *
 * Counterparts are matched by type and occurrence — the second verse in German
 * belongs to the second verse in English — not by label, which the importers
 * filled in every language and spelling there is.
 */
export function buildLineParts(
  parts: TaggedPart[],
  bookLanguage: string,
  primary: string,
  secondary: string | null
): LinePart[] {
  const main = partsInLanguage(parts, primary, bookLanguage);
  const other = secondary && secondary !== primary ? partsInLanguage(parts, secondary, bookLanguage) : [];
  const seen = new Map<string, number>();
  const paired = main.map((p) => {
    const nth = seen.get(p.type) ?? 0;
    seen.set(p.type, nth + 1);
    const match = other.filter((o) => o.type === p.type)[nth];
    // Whichever side of the pair is the translation decides how it is sung:
    // after a language swap the original sits underneath a translation.
    const translation = [p, match].find((x) => x && isTranslation(x));
    return {
      type: p.type,
      lines: alignLines(splitLines(p.lyrics), match ? splitLines(match.lyrics) : []),
      subStyle: translation?.translationType === 'singable' ? ('singable' as const) : ('reference' as const),
    };
  });
  return expandParts(paired);
}

export interface LineStep {
  /** Full-verse slide number: 0 is the title, 1..n the parts, n+1 the Amen. */
  partIndex: number;
  /** First line of the part on this step. */
  lineIndex: number;
  /** Lines on this step; 0 for the title, the Amen and an empty part. */
  count: number;
}

/** Every step of a song in line mode, title and Amen included. */
export function buildSteps(parts: LinePart[], perSlide: LinesPerSlide): LineStep[] {
  const steps: LineStep[] = [{ partIndex: 0, lineIndex: 0, count: 0 }];
  parts.forEach((part, i) => {
    if (part.lines.length === 0) {
      steps.push({ partIndex: i + 1, lineIndex: 0, count: 0 });
      return;
    }
    for (let line = 0; line < part.lines.length; line += perSlide) {
      steps.push({ partIndex: i + 1, lineIndex: line, count: Math.min(perSlide, part.lines.length - line) });
    }
  });
  steps.push({ partIndex: parts.length + 1, lineIndex: 0, count: 0 });
  return steps;
}

/**
 * The step showing a given line. Positions that no longer exist — after a
 * language swap to a shorter translation, say — land on the nearest step
 * before them instead of failing.
 */
export function findStep(steps: LineStep[], partIndex: number, lineIndex: number): number {
  let found = -1;
  steps.forEach((s, i) => {
    if (s.partIndex === partIndex && s.lineIndex <= lineIndex) found = i;
  });
  if (found >= 0) return found;
  if (partIndex <= 0) return 0;
  for (let i = steps.length - 1; i >= 0; i--) if (steps[i].partIndex <= partIndex) return i;
  return 0;
}

/** Snaps a line to the first line of its slide after a 1 ↔ 2 lines switch. */
export function snapLine(lineIndex: number, perSlide: LinesPerSlide): number {
  return Math.floor(lineIndex / perSlide) * perSlide;
}
