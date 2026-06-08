'use client';

export interface BibleLastRead {
  translationCode: string;
  translationName: string;
  bookCode: string;
  bookName: string;
  chapter: number;
  verse?: number;
  range?: { from: number; to: number };
  savedAt: number;
}

const KEY = 'bible_last_read';

export function readLastRead(): BibleLastRead | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BibleLastRead;
    if (!parsed.translationCode || !parsed.bookCode || !parsed.chapter) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastRead(value: BibleLastRead) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...value, savedAt: Date.now() }));
  } catch {
    // localStorage might be disabled or full — silently ignore
  }
}

export function clearLastRead() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

const FONT_KEY = 'bible_font_scale';

export type FontScale = 1.0 | 1.15 | 1.3 | 1.5 | 1.7 | 1.9 | 2.1;
export const FONT_SCALES: FontScale[] = [1.0, 1.15, 1.3, 1.5, 1.7, 1.9, 2.1];
export const DEFAULT_FONT_SCALE: FontScale = 1.5;

export function readFontScale(): FontScale {
  if (typeof window === 'undefined') return DEFAULT_FONT_SCALE;
  try {
    const raw = window.localStorage.getItem(FONT_KEY);
    const v = raw ? parseFloat(raw) : DEFAULT_FONT_SCALE;
    return (FONT_SCALES.includes(v as FontScale) ? v : DEFAULT_FONT_SCALE) as FontScale;
  } catch {
    return DEFAULT_FONT_SCALE;
  }
}

export function writeFontScale(value: FontScale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FONT_KEY, String(value));
  } catch {
    // ignore
  }
}
