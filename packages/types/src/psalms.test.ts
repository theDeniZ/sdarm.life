import { describe, it, expect } from 'vitest';
import { hebrewToLxxPsalm, lxxToHebrewPsalm, remapPsalmChapter, resolveParallelPsalmChapters } from './psalms';

/**
 * Ground truth verified live against the YouVersion Platform API on 2026-07-25
 * using DELUT (id 51, Hebrew numbering) and NRT (id 143, LXX numbering).
 * YouVersion serves each Bible in its publisher's own numbering and does not
 * normalise, so this mapping stays load-bearing for parallel mode.
 *
 * Verse counts that pin the split points:
 *   LXX   9 (39v) = Heb   9 (20v) + Heb  10 (18v)
 *   LXX 113 (26v) = Heb 114 ( 8v) + Heb 115 (18v)
 *   LXX 114 ( 9v) + LXX 115 (10v) = Heb 116 (19v)
 *   LXX 146 (11v) + LXX 147 ( 9v) = Heb 147 (20v)
 */
describe('LXX ↔ Hebrew psalm numbering', () => {
  it('leaves psalms 1–8 and 148–150 untouched', () => {
    for (const n of [1, 5, 8, 148, 150]) {
      expect(lxxToHebrewPsalm(n)).toBe(n);
      expect(hebrewToLxxPsalm(n)).toBe(n);
    }
  });

  it('maps the common one-lower range', () => {
    // The case the feature exists for: NRT PSA.22 is "The Lord is my shepherd".
    expect(hebrewToLxxPsalm(23)).toBe(22);
    expect(lxxToHebrewPsalm(22)).toBe(23);
    expect(lxxToHebrewPsalm(10)).toBe(11);
    expect(lxxToHebrewPsalm(112)).toBe(113);
    expect(hebrewToLxxPsalm(146)).toBe(145);
  });

  it('collapses Hebrew 9 and 10 into LXX 9', () => {
    expect(hebrewToLxxPsalm(9)).toBe(9);
    expect(hebrewToLxxPsalm(10)).toBe(9);
    expect(lxxToHebrewPsalm(9)).toBe(9);
  });

  it('collapses Hebrew 114 and 115 into LXX 113', () => {
    expect(hebrewToLxxPsalm(114)).toBe(113);
    expect(hebrewToLxxPsalm(115)).toBe(113);
    expect(lxxToHebrewPsalm(113)).toBe(114);
  });

  it('splits Hebrew 116 into LXX 114 and 115', () => {
    expect(hebrewToLxxPsalm(116)).toBe(114);
    expect(lxxToHebrewPsalm(114)).toBe(116);
    expect(lxxToHebrewPsalm(115)).toBe(116);
  });

  it('splits Hebrew 147 into LXX 146 and 147', () => {
    expect(hebrewToLxxPsalm(147)).toBe(146);
    expect(lxxToHebrewPsalm(146)).toBe(147);
    expect(lxxToHebrewPsalm(147)).toBe(147);
  });

  it('keeps the 176-verse acrostic aligned (Heb 119 = LXX 118)', () => {
    expect(hebrewToLxxPsalm(119)).toBe(118);
    expect(lxxToHebrewPsalm(118)).toBe(119);
  });

  it('round-trips every psalm outside the split points', () => {
    const splits = new Set([9, 10, 114, 115, 116, 147]);
    for (let n = 1; n <= 150; n++) {
      if (splits.has(n)) continue;
      expect(lxxToHebrewPsalm(hebrewToLxxPsalm(n))).toBe(n);
    }
  });
});

describe('resolveParallelPsalmChapters', () => {
  it('does not remap when both sides share a numbering', () => {
    expect(resolveParallelPsalmChapters(false, false, 'PSA', 23)).toEqual({ chapterA: 23, chapterB: 23 });
    expect(resolveParallelPsalmChapters(true, true, 'PSA', 22)).toEqual({ chapterA: 22, chapterB: 22 });
  });

  it('does not remap outside Psalms', () => {
    expect(resolveParallelPsalmChapters(false, true, 'JHN', 3)).toEqual({ chapterA: 3, chapterB: 3 });
  });

  it('maps only the B side, leaving the requested chapter authoritative', () => {
    // Hebrew A asks for Psalm 23 → LXX B must fetch 22.
    expect(resolveParallelPsalmChapters(false, true, 'PSA', 23)).toEqual({ chapterA: 23, chapterB: 22 });
    // LXX A asks for Psalm 22 → Hebrew B must fetch 23.
    expect(resolveParallelPsalmChapters(true, false, 'PSA', 22)).toEqual({ chapterA: 22, chapterB: 23 });
  });
});

describe('remapPsalmChapter', () => {
  it('keeps the same psalm visible when the operator switches translation A', () => {
    expect(remapPsalmChapter(false, true, 'PSA', 23)).toBe(22);
    expect(remapPsalmChapter(true, false, 'PSA', 22)).toBe(23);
  });

  it('is a no-op for an unchanged numbering or a non-Psalm book', () => {
    expect(remapPsalmChapter(false, false, 'PSA', 23)).toBe(23);
    expect(remapPsalmChapter(false, true, 'JHN', 3)).toBe(3);
  });
});
