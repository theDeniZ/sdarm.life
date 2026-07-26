/**
 * Verse-copy formatting & user preferences.
 *
 * Builds clipboard text for one or more selected verses, governed by the user's
 * persisted CopyOptions. Output is intended for pasting into other apps
 * (Pages, Word, sermon notes, chat) — not back into our reader.
 */

export type LinkStyle = 'none' | 'short' | 'full';
export type VerseNumberStyle = 'none' | 'plain' | 'superscript' | 'bracket';
export type QuoteStyle = 'none' | 'curly' | 'german' | 'guillemets';
export type ReferencePosition = 'top' | 'bottom';
export type ReferenceBookStyle = 'full' | 'abbr' | 'code';
export type TranslationNameStyle = 'full' | 'short';

export interface CopyOptions {
  // Verse numbers — 'none' replaces the old `includeNumbers: false`.
  verseNumberStyle: VerseNumberStyle;
  // Reference line "John 3:16-18 (Luther 1912)"
  includeReference: boolean;
  referencePosition: ReferencePosition;
  referenceBookStyle: ReferenceBookStyle;
  includeTranslation: boolean;
  translationNameStyle: TranslationNameStyle;
  // Quotation marks around the verse block
  quoteStyle: QuoteStyle;
  // Link to the chapter on our site
  linkStyle: LinkStyle;
  // Per-verse separator
  separator: 'space' | 'newline';
  // Markdown formatting (bold reference, italic verses where applicable)
  markdown: boolean;
}

export const DEFAULT_COPY_OPTIONS: CopyOptions = {
  verseNumberStyle: 'plain',
  includeReference: true,
  referencePosition: 'top',
  referenceBookStyle: 'full',
  includeTranslation: true,
  translationNameStyle: 'full',
  quoteStyle: 'none',
  linkStyle: 'short',
  separator: 'newline',
  markdown: false,
};

/**
 * Short label for a translation. YouVersion supplies a localized abbreviation
 * (`DELUT`, `KJV`, `NRT`); fall back to the slug when it is missing.
 */
export function shortTranslationName(abbreviation: string, code: string): string {
  return abbreviation.trim() || code.toUpperCase();
}

/** Unicode superscript digits 0–9. */
const SUP_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUP_DIGITS[d] ?? d)
    .join('');
}

function formatVerseNumber(n: number, style: VerseNumberStyle): string {
  switch (style) {
    case 'none':
      return '';
    case 'superscript':
      return toSuperscript(n) + ' ';
    case 'bracket':
      return `[${n}] `;
    case 'plain':
    default:
      return `${n}. `;
  }
}

function quoteMarks(style: QuoteStyle): { open: string; close: string } {
  switch (style) {
    case 'curly':
      return { open: '“', close: '”' };
    case 'german':
      return { open: '„', close: '“' };
    case 'guillemets':
      return { open: '«', close: '»' };
    case 'none':
    default:
      return { open: '', close: '' };
  }
}

const STORAGE_KEY = 'bible_copy_options';

export function readCopyOptions(): CopyOptions {
  if (typeof window === 'undefined') return DEFAULT_COPY_OPTIONS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COPY_OPTIONS;
    const parsed = JSON.parse(raw) as Partial<CopyOptions>;
    const merged = { ...DEFAULT_COPY_OPTIONS, ...parsed };
    if (merged.referenceBookStyle === 'code') merged.referenceBookStyle = 'full';
    return merged;
  } catch {
    return DEFAULT_COPY_OPTIONS;
  }
}

export function writeCopyOptions(opts: CopyOptions): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
  } catch {
    // quota / disabled storage — silently ignore
  }
}

interface BuildArgs {
  options: CopyOptions;
  bookName: string; // e.g. "Johannes"
  bookAbbr: string; // e.g. "Joh"
  bookCode: string; // e.g. "JOH" (USFM)
  chapter: number;
  translationName: string; // e.g. "Lutherbibel 1912"
  translationCode: string; // URL slug, e.g. "delut"
  translationAbbr: string; // e.g. "DELUT"
  verses: { verse: number; text: string }[]; // already filtered to selected, sorted asc
  pageUrl: string; // canonical chapter URL (without verse anchor)
}

/**
 * Format the selected verses for the clipboard. Honours every CopyOptions
 * dimension: verse-number style, reference position, reference book style,
 * translation full/short, quote marks, line separator, link style and Markdown.
 */
export function buildCopyText(args: BuildArgs): string {
  const {
    options,
    bookName,
    bookAbbr,
    bookCode,
    chapter,
    translationName,
    translationCode,
    translationAbbr,
    verses,
    pageUrl,
  } = args;
  if (verses.length === 0) return '';

  const range = formatVerseRange(verses.map((v) => v.verse));
  const bookLabel =
    options.referenceBookStyle === 'code' ? bookCode : options.referenceBookStyle === 'abbr' ? bookAbbr : bookName;
  let referenceLine = `${bookLabel} ${chapter}:${range}`;
  if (options.includeTranslation) {
    const trName =
      options.translationNameStyle === 'short'
        ? shortTranslationName(translationAbbr, translationCode)
        : translationName;
    referenceLine += ` (${trName})`;
  }
  if (options.markdown) referenceLine = `**${referenceLine}**`;

  const sep = options.separator === 'newline' ? '\n' : ' ';
  let verseBlock = verses.map((v) => `${formatVerseNumber(v.verse, options.verseNumberStyle)}${v.text}`).join(sep);

  const quotes = quoteMarks(options.quoteStyle);
  if (quotes.open) verseBlock = `${quotes.open}${verseBlock}${quotes.close}`;

  const lines: string[] = [];
  if (options.includeReference && options.referencePosition === 'top') lines.push(referenceLine);
  lines.push(verseBlock);
  if (options.includeReference && options.referencePosition === 'bottom') lines.push('— ' + referenceLine);

  if (options.linkStyle !== 'none') {
    const first = verses[0]?.verse;
    const rawUrl = first !== undefined ? `${pageUrl}#v${first}` : pageUrl;
    const url = options.markdown ? `[${rawUrl}](${rawUrl})` : rawUrl;
    if (options.linkStyle === 'short') lines.push(url);
    else lines.push('', url);
  }

  return lines.join('\n');
}

/**
 * "16, 18" → "16,18"
 * "16, 17, 18" → "16-18"
 * "16, 17, 19" → "16-17,19"
 */
function formatVerseRange(nums: number[]): string {
  if (nums.length === 0) return '';
  const sorted = [...nums].sort((a, b) => a - b);
  const groups: string[] = [];
  let runStart = sorted[0];
  let runEnd = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === runEnd + 1) {
      runEnd = n;
    } else {
      groups.push(runStart === runEnd ? `${runStart}` : `${runStart}-${runEnd}`);
      runStart = n;
      runEnd = n;
    }
  }
  groups.push(runStart === runEnd ? `${runStart}` : `${runStart}-${runEnd}`);
  return groups.join(',');
}
