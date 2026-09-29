import { describe, expect, it } from 'vitest';
import type { SongPartDto } from '@sdarm/types';
import {
  alignLines,
  buildLineParts,
  buildSteps,
  findStep,
  partsInLanguage,
  snapLine,
  songLanguages,
  splitLines,
} from './line-mode';

type Part = Pick<SongPartDto, 'type' | 'lyrics' | 'language' | 'translationType'>;

const part = (type: Part['type'], lyrics: string, extra: Partial<Part> = {}): Part => ({
  type,
  lyrics,
  language: null,
  translationType: 'original',
  ...extra,
});

const de = (type: Part['type'], lyrics: string, translationType: Part['translationType'] = 'reference') =>
  part(type, lyrics, { language: 'de', translationType });

describe('splitLines', () => {
  it('strips chords and drops blank lines', () => {
    expect(splitLines('[G]Holy, [C]holy\n\n  Lord God  \n')).toEqual(['Holy, holy', 'Lord God']);
  });
});

describe('alignLines', () => {
  it('pairs line for line', () => {
    expect(alignLines(['a', 'b'], ['x', 'y'])).toEqual([
      { text: 'a', sub: ['x'] },
      { text: 'b', sub: ['y'] },
    ]);
  });

  it('leaves missing translation lines empty', () => {
    expect(alignLines(['a', 'b'], ['x'])).toEqual([
      { text: 'a', sub: ['x'] },
      { text: 'b', sub: [] },
    ]);
  });

  it('keeps a longer translation under the last line instead of dropping it', () => {
    expect(alignLines(['a'], ['x', 'y', 'z'])).toEqual([{ text: 'a', sub: ['x', 'y', 'z'] }]);
  });
});

describe('languages', () => {
  const parts = [part('verse', 'one'), de('verse', 'eins'), part('verse', 'two', { language: 'en' })];

  it('lists the original language first, falling back to the songbook language', () => {
    expect(songLanguages(parts, 'en')).toEqual(['en', 'de']);
    expect(songLanguages([de('verse', 'eins'), part('verse', 'one')], 'en')).toEqual(['en', 'de']);
  });

  it('treats an untagged song as one language', () => {
    expect(songLanguages([part('verse', 'a'), part('chorus', 'b')], 'ru')).toEqual(['ru']);
  });

  it('filters parts by effective language', () => {
    expect(partsInLanguage(parts, 'en', 'en').map((p) => p.lyrics)).toEqual(['one', 'two']);
    expect(partsInLanguage(parts, 'de', 'en').map((p) => p.lyrics)).toEqual(['eins']);
  });
});

describe('buildLineParts', () => {
  const song = [
    part('verse', 'Holy\nEarly'),
    part('chorus', 'Amen'),
    part('verse', 'Second'),
    de('verse', 'Heilig\nFrüh'),
    de('chorus', 'Amen de'),
    de('verse', 'Zweite'),
  ];

  it('expands choruses like the full-verse projector and pairs by type and occurrence', () => {
    const parts = buildLineParts(song, 'en', 'en', 'de');
    expect(parts.map((p) => p.type)).toEqual(['verse', 'chorus', 'verse', 'chorus']);
    expect(parts[0].lines).toEqual([
      { text: 'Holy', sub: ['Heilig'] },
      { text: 'Early', sub: ['Früh'] },
    ]);
    expect(parts[2].lines).toEqual([{ text: 'Second', sub: ['Zweite'] }]);
    expect(parts[3].lines).toEqual([{ text: 'Amen', sub: ['Amen de'] }]);
    expect(parts[0].subStyle).toBe('reference');
  });

  it('shows no sublines without a secondary language', () => {
    const parts = buildLineParts(song, 'en', 'en', null);
    expect(parts[0].lines.every((l) => l.sub.length === 0)).toBe(true);
  });

  it('swaps roles: the translation leads and the original goes underneath', () => {
    const parts = buildLineParts(song, 'en', 'de', 'en');
    expect(parts[0].lines[0]).toEqual({ text: 'Heilig', sub: ['Holy'] });
    expect(parts[0].subStyle).toBe('reference');
  });

  it('renders a singable translation at full size in either role', () => {
    const singable = [part('verse', 'Holy'), de('verse', 'Heilig', 'singable')];
    expect(buildLineParts(singable, 'en', 'en', 'de')[0].subStyle).toBe('singable');
    expect(buildLineParts(singable, 'en', 'de', 'en')[0].subStyle).toBe('singable');
  });
});

describe('steps', () => {
  const parts = buildLineParts([part('verse', 'a\nb\nc'), part('verse', '')], 'en', 'en', null);

  it('splits parts into one-line steps between the title and the Amen', () => {
    expect(buildSteps(parts, 1)).toEqual([
      { partIndex: 0, lineIndex: 0, count: 0 },
      { partIndex: 1, lineIndex: 0, count: 1 },
      { partIndex: 1, lineIndex: 1, count: 1 },
      { partIndex: 1, lineIndex: 2, count: 1 },
      { partIndex: 2, lineIndex: 0, count: 0 },
      { partIndex: 3, lineIndex: 0, count: 0 },
    ]);
  });

  it('pairs lines two by two, the odd one alone', () => {
    expect(buildSteps(parts, 2).filter((s) => s.partIndex === 1)).toEqual([
      { partIndex: 1, lineIndex: 0, count: 2 },
      { partIndex: 1, lineIndex: 2, count: 1 },
    ]);
  });

  it('finds the step holding a line, and a nearby one for positions that vanished', () => {
    const two = buildSteps(parts, 2);
    expect(findStep(two, 1, 1)).toBe(1);
    expect(findStep(two, 1, 2)).toBe(2);
    expect(findStep(two, 1, 9)).toBe(2);
    expect(findStep(two, 0, 0)).toBe(0);
    expect(findStep(two, 9, 0)).toBe(two.length - 1);
  });

  it('snaps a line to the start of its slide', () => {
    expect(snapLine(3, 2)).toBe(2);
    expect(snapLine(3, 1)).toBe(3);
  });
});
