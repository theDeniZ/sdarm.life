// Psalm chapter mapping between LXX (Septuagint) and Hebrew/Western numbering.
// Used by the Bible API repository (server) and parallel reader UI (client) —
// both must agree on the mapping, hence shared.
//
// Synodal Russian translation uses LXX numbering. Luther 1912 and KJV use Hebrew.
// The dominant pattern is "Synodal is one less" for chapters 10–112 and 116–145,
// with edge cases (Pss 9, 113-115, 116, 146-147) where psalms were combined or split.

export const LXX_PSALM_TRANSLATION_CODES: ReadonlySet<string> = new Set(['synodal']);

/** LXX (Synodal) chapter → Hebrew (Luther/KJV) chapter. */
export function lxxToHebrewPsalm(lxx: number): number {
  if (lxx <= 8) return lxx;
  if (lxx === 9) return 9;
  if (lxx <= 112) return lxx + 1;
  if (lxx === 113) return 114;
  if (lxx === 114 || lxx === 115) return 116;
  if (lxx <= 145) return lxx + 1;
  if (lxx === 146 || lxx === 147) return 147;
  return lxx;
}

/** Hebrew (Luther/KJV) chapter → LXX (Synodal) chapter. */
export function hebrewToLxxPsalm(hebrew: number): number {
  if (hebrew <= 8) return hebrew;
  if (hebrew === 9 || hebrew === 10) return 9;
  if (hebrew <= 113) return hebrew - 1;
  if (hebrew === 114 || hebrew === 115) return 113;
  if (hebrew === 116) return 114;
  if (hebrew <= 146) return hebrew - 1;
  if (hebrew === 147) return 146;
  return hebrew;
}

/**
 * Resolve the actual chapter to fetch on each side when comparing in parallel mode.
 * `requestedChapter` is in `codeA`'s numbering; we map to `codeB`'s numbering for the B side.
 */
export function resolveParallelPsalmChapters(
  codeA: string,
  codeB: string,
  bookCode: string,
  requestedChapter: number
): { chapterA: number; chapterB: number } {
  if (bookCode !== 'PSA') return { chapterA: requestedChapter, chapterB: requestedChapter };
  const aIsLxx = LXX_PSALM_TRANSLATION_CODES.has(codeA);
  const bIsLxx = LXX_PSALM_TRANSLATION_CODES.has(codeB);
  if (aIsLxx === bIsLxx) return { chapterA: requestedChapter, chapterB: requestedChapter };
  if (aIsLxx) return { chapterA: requestedChapter, chapterB: lxxToHebrewPsalm(requestedChapter) };
  return { chapterA: requestedChapter, chapterB: hebrewToLxxPsalm(requestedChapter) };
}

/**
 * When the user switches translation A in parallel mode, remap the chapter
 * through the canonical Hebrew Psalm numbering so the same content stays visible.
 */
export function remapPsalmChapter(oldCode: string, newCode: string, bookCode: string, oldChapter: number): number {
  if (bookCode !== 'PSA') return oldChapter;
  const oldIsLxx = LXX_PSALM_TRANSLATION_CODES.has(oldCode);
  const newIsLxx = LXX_PSALM_TRANSLATION_CODES.has(newCode);
  if (oldIsLxx === newIsLxx) return oldChapter;
  return oldIsLxx ? lxxToHebrewPsalm(oldChapter) : hebrewToLxxPsalm(oldChapter);
}
