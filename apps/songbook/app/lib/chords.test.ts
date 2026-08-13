import { describe, it, expect } from 'vitest';
import { transposeChord, transposeLine, detectKey } from './chords';

describe('transposeChord', () => {
  it('transposes German H (B-natural) chords, including with suffixes', () => {
    expect(transposeChord('H7', 1)).toBe('C7');
    expect(transposeChord('Hm', 5)).toBe('Em');
  });

  it('distinguishes German B (B-flat) from H (B-natural)', () => {
    expect(transposeChord('B', 1)).toBe('H');
    expect(transposeChord('H', -1)).toBe('B');
  });

  it('accepts English flat/sharp spellings as input', () => {
    expect(transposeChord('Bb', 2)).toBe('C');
    expect(transposeChord('F#', 1)).toBe('G');
  });

  it('preserves flat spelling preference in the output', () => {
    expect(transposeChord('Db', 2)).toBe('Eb');
  });

  it('wraps around the octave in both directions', () => {
    expect(transposeChord('C', -1)).toBe('H');
    expect(transposeChord('H', 1)).toBe('C');
  });

  it('returns the chord unchanged for zero semitones or an unknown root', () => {
    expect(transposeChord('G', 0)).toBe('G');
    expect(transposeChord('X7', 2)).toBe('X7');
  });
});

describe('transposeLine', () => {
  it('transposes every chord token in a lyric line', () => {
    expect(transposeLine('[H]Amazing [B]grace [Am7]how', 2)).toBe('[C#]Amazing [C]grace [Hm7]how');
  });
});

describe('detectKey', () => {
  it('detects H as a valid tonic', () => {
    expect(detectKey([{ lyrics: '[H]a [H]b [G]c\n[H]d' }])).toBe('H');
  });
});
