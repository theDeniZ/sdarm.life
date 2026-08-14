import type { SongPartDto, TranslationType } from '@sdarm/types';

export interface LineSlide {
  partIndex: number;
  lineIndex: number;
  partTotal: number;
  partType: string;
  partLabel: string;
  line: string;
  translations: { line: string; language: string | null; translationType: TranslationType }[];
}

export function getOriginalParts(parts: SongPartDto[]): SongPartDto[] {
  return parts.filter((p) => p.translationType !== 'singable' && p.translationType !== 'reference');
}

export function getTranslationParts(parts: SongPartDto[]): SongPartDto[] {
  return parts.filter((p) => p.translationType === 'singable' || p.translationType === 'reference');
}

export function buildLineSlides(parts: SongPartDto[]): LineSlide[] {
  const originals = expandParts(getOriginalParts(parts));
  const translations = getTranslationParts(parts);

  const slides: LineSlide[] = [];
  for (let pi = 0; pi < originals.length; pi++) {
    const orig = originals[pi];
    const lines = orig.lyrics.split('\n');

    // Find translations that correspond to the same sort_order group
    const matchedTrans = translations.filter((t) => t.sortOrder === orig.sortOrder);

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (!line.trim()) continue;
      const transLines = matchedTrans.map((t) => ({
        line: t.lyrics.split('\n')[li] ?? '',
        language: t.language,
        translationType: t.translationType as TranslationType,
      }));
      slides.push({
        partIndex: pi,
        lineIndex: li,
        partTotal: lines.filter((l) => l.trim()).length,
        partType: orig.type,
        partLabel: orig.label,
        line,
        translations: transLines,
      });
    }
  }
  return slides;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function partLabel(type: string, label: string): string {
  if (label) return label;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Default the projector slide theme to whatever the site theme currently is.
export function getSiteTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

// Swaps primary/reference role: the specified language becomes the main line,
// the original moves to reference subtitles.
export function swapPrimaryLang(slide: LineSlide, primaryLang: string): LineSlide {
  const primaryTr = slide.translations.find((t) => t.language === primaryLang);
  if (!primaryTr) return slide;
  return {
    ...slide,
    line: primaryTr.line,
    translations: [
      { line: slide.line, language: null, translationType: 'reference' as TranslationType },
      ...slide.translations.filter((t) => t.language !== primaryLang),
    ],
  };
}

// Returns the list of unique languages from translations across all LineSlides.
export function getAvailableLanguages(slides: LineSlide[]): string[] {
  const langs = new Set<string>();
  for (const s of slides) {
    for (const tr of s.translations) {
      if (tr.language) langs.add(tr.language);
    }
  }
  return Array.from(langs);
}

// Interleaves chorus parts after each verse so the chorus repeats between verses.
// Chorus parts are removed from their original position and re-inserted after every verse.
// If there are no chorus parts, returns the original array unchanged.
export function expandParts<T extends { type: string }>(parts: T[]): T[] {
  const choruses = parts.filter((p) => p.type === 'chorus');
  if (choruses.length === 0) return parts;

  const result: T[] = [];
  for (const part of parts) {
    if (part.type === 'chorus') continue;
    result.push(part);
    if (part.type === 'verse') result.push(...choruses);
  }
  return result;
}
