import { describe, expect, it } from 'vitest';
import {
  isPlainPublicDomain,
  MAX_SLIDE_VERSES,
  normalizeTheme,
  projectorLabel,
  slideFromPassage,
  splitSlide,
  verseRange,
  withinRangeCap,
  type Passage,
  type Slide,
  type SlideSide,
} from './projector';

const side = (code: string): SlideSide => ({
  code,
  abbreviation: code.toUpperCase(),
  name: code,
  language: 'de',
  bookName: 'Ester',
  chapter: 8,
  license: {} as SlideSide['license'],
});

const passage: Passage = {
  bookCode: 'EST',
  chapter: 8,
  sides: [side('a'), side('b')],
  verses: Array.from({ length: 17 }, (_, i) => ({ verse: i + 1, texts: [`a${i + 1}`, `b${i + 1}`] })),
};
const chapter = passage.verses.map((v) => v.verse);

describe('verse range cap', () => {
  it('is four verses', () => {
    expect(MAX_SLIDE_VERSES).toBe(4);
  });

  it('keeps a range of up to four verses whole', () => {
    expect(verseRange(chapter, 6, 9)).toEqual({ verses: [6, 7, 8, 9], capped: false });
    expect(verseRange(chapter, 9, 6)).toEqual({ verses: [6, 7, 8, 9], capped: false });
  });

  it('stops four verses from the anchor, in the direction of the extension', () => {
    expect(verseRange(chapter, 6, 12)).toEqual({ verses: [6, 7, 8, 9], capped: true });
    expect(verseRange(chapter, 12, 6)).toEqual({ verses: [9, 10, 11, 12], capped: true });
  });

  it('counts only verses the chapter has', () => {
    const gappy = [1, 2, 5, 6, 7];
    expect(verseRange(gappy, 1, 6)).toEqual({ verses: [1, 2, 5, 6], capped: false });
    expect(verseRange(gappy, 1, 7)).toEqual({ verses: [1, 2, 5, 6], capped: true });
  });

  it('marks verses beyond the cap as unreachable from the anchor', () => {
    expect(withinRangeCap(chapter, 6, 9)).toBe(true);
    expect(withinRangeCap(chapter, 6, 3)).toBe(true);
    expect(withinRangeCap(chapter, 6, 10)).toBe(false);
    expect(withinRangeCap(chapter, 6, 2)).toBe(false);
  });

  it('refuses a slide of more than four verses', () => {
    expect(slideFromPassage(passage, [6, 7, 8, 9])?.rows.map((r) => r.verse)).toEqual([6, 7, 8, 9]);
    expect(slideFromPassage(passage, [6, 7, 8, 9, 10])).toBeNull();
  });
});

describe('splitSlide', () => {
  const long = (words: number, tag: string) =>
    Array.from({ length: words }, (_, i) => `${tag}${i}${i % 9 === 8 ? ',' : ''}`).join(' ');
  const oneVerse: Slide = {
    bookCode: 'EST',
    chapter: 8,
    sides: [side('a'), side('b')],
    rows: [{ verse: 9, texts: [long(90, 'x'), long(70, 'y')] }],
  };

  it('leaves a slide alone when one screen is enough', () => {
    expect(splitSlide(oneVerse, 1)).toEqual([oneVerse]);
  });

  it('cuts one verse into screens on word boundaries without losing a word', () => {
    const parts = splitSlide(oneVerse, 2);
    expect(parts).toHaveLength(2);
    for (let i = 0; i < 2; i++) {
      const joined = parts.map((p) => p.rows[0].texts[i]).join(' ');
      expect(joined).toBe(oneVerse.rows[0].texts[i]);
    }
    expect(parts[0].rows[0]).toMatchObject({ continues: true });
    expect(parts[0].rows[0].continued).toBeUndefined();
    expect(parts[1].rows[0]).toMatchObject({ continued: true });
    expect(parts[1].rows[0].continues).toBeUndefined();
  });

  it('keeps every translation on every screen', () => {
    for (const p of splitSlide(oneVerse, 3)) {
      expect(p.sides).toHaveLength(2);
      expect(p.rows[0].texts.every((t) => t && t.length > 0)).toBe(true);
    }
  });

  it('breaks a range between verses when a cut falls near a verse edge', () => {
    const range: Slide = {
      ...oneVerse,
      rows: [6, 7, 8, 9].map((verse) => ({ verse, texts: [long(40, `a${verse}-`), long(40, `b${verse}-`)] })),
    };
    const parts = splitSlide(range, 2);
    expect(parts.map((p) => p.rows.map((r) => r.verse))).toEqual([
      [6, 7],
      [8, 9],
    ]);
    expect(parts.flatMap((p) => p.rows).every((r) => !r.continued && !r.continues)).toBe(true);
  });

  it('keeps a missing text missing on every screen', () => {
    const gap: Slide = { ...oneVerse, rows: [{ verse: 9, texts: [long(90, 'x'), null] }] };
    for (const p of splitSlide(gap, 2)) expect(p.rows[0].texts[1]).toBeNull();
  });
});

describe('normalizeTheme', () => {
  it('keeps the current themes', () => {
    for (const t of ['violet', 'graphite', 'ink', 'paper']) expect(normalizeTheme(t)).toBe(t);
  });

  it('maps the earlier themes to their nearest successor', () => {
    expect(normalizeTheme('museum')).toBe('violet');
    expect(normalizeTheme('warm')).toBe('violet');
    expect(normalizeTheme('light')).toBe('paper');
  });

  it('falls back to Violett for anything else', () => {
    expect(normalizeTheme(undefined)).toBe('violet');
    expect(normalizeTheme('sepia')).toBe('violet');
    expect(normalizeTheme(3)).toBe('violet');
  });
});

describe('projectorLabel', () => {
  it('uses the labels congregations know from BibleShow', () => {
    expect(projectorLabel({ code: 'synodal', abbreviation: 'СП' })).toBe('RST');
    expect(projectorLabel({ code: 'luther1912', abbreviation: 'LUT1912' })).toBe('LUT');
    expect(projectorLabel({ code: 'elberfelder1905', abbreviation: 'ELB1905' })).toBe('ELB');
    expect(projectorLabel({ code: 'rv1909', abbreviation: 'RV1909' })).toBe('RV');
  });

  it('falls back to the API abbreviation', () => {
    expect(projectorLabel({ code: 'neu', abbreviation: 'NEU' })).toBe('NEU');
  });
});

describe('isPlainPublicDomain', () => {
  const license = (basis: string, notice: string | null) => ({ basis, notice }) as unknown as SlideSide['license'];

  it('is true for a public-domain text with nothing to print', () => {
    expect(isPlainPublicDomain(license('public-domain', null))).toBe(true);
  });

  it('is false when the license asks for its own notice or is not public domain', () => {
    expect(isPlainPublicDomain(license('public-domain', 'Text: © Example'))).toBe(false);
    expect(isPlainPublicDomain(license('permission', null))).toBe(false);
    expect(isPlainPublicDomain(license('provider', null))).toBe(false);
  });
});
