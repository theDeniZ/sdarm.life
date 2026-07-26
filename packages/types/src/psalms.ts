// Psalm chapter mapping between LXX (Septuagint) and Hebrew/Western numbering.
//
// Translations that follow the Septuagint (Church Slavonic, Russian Synodal and
// relatives) number most Psalms one lower than Hebrew-numbered translations
// (Luther, KJV, …). Without a remap, parallel mode would show Psalm 23 next to
// the wrong Psalm.
//
// Whether a given translation uses LXX numbering is carried on
// `BibleTranslationDto.lxxPsalms`, detected server-side from the books payload
// rather than hardcoded — `detectLxxPsalms()` in
// `apps/api/src/services/bible/youversion.ts` checks whether PSA.118 is the
// 176-verse acrostic. Both the API and the parallel reader UI call these
// helpers, hence shared.
//
// YouVersion serves each Bible in its own publisher numbering and does not
// normalise: verified 2026-07-25 against DELUT (51, Hebrew) and NRT (143, LXX),
// where NRT PSA.22 is "The Lord is my shepherd" and NRT PSA.118 has 176 verses.
// The splits below were confirmed by verse count in the same check — LXX 9 (39v)
// = Heb 9 (20v) + 10 (18v), LXX 113 (26v) = Heb 114 (8v) + 115 (18v),
// LXX 114 (9v) + 115 (10v) = Heb 116 (19v), LXX 146 (11v) + 147 (9v) = Heb 147 (20v).
//
// The dominant pattern is "LXX is one less" for chapters 10–112 and 116–145,
// with edge cases (Pss 9, 113-115, 116, 146-147) where psalms were combined or split.

/** LXX (e.g. Synodal) chapter → Hebrew (Luther/KJV) chapter. */
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

/** Hebrew (Luther/KJV) chapter → LXX (e.g. Synodal) chapter. */
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
 * `requestedChapter` is in A's numbering; the B side is mapped into B's numbering.
 */
export function resolveParallelPsalmChapters(
  aIsLxx: boolean,
  bIsLxx: boolean,
  bookCode: string,
  requestedChapter: number
): { chapterA: number; chapterB: number } {
  if (bookCode !== 'PSA' || aIsLxx === bIsLxx) {
    return { chapterA: requestedChapter, chapterB: requestedChapter };
  }
  return {
    chapterA: requestedChapter,
    chapterB: aIsLxx ? lxxToHebrewPsalm(requestedChapter) : hebrewToLxxPsalm(requestedChapter),
  };
}

/**
 * When the user switches translation A in parallel mode, remap the chapter so
 * the same content stays visible.
 */
export function remapPsalmChapter(
  oldIsLxx: boolean,
  newIsLxx: boolean,
  bookCode: string,
  oldChapter: number
): number {
  if (bookCode !== 'PSA' || oldIsLxx === newIsLxx) return oldChapter;
  return oldIsLxx ? lxxToHebrewPsalm(oldChapter) : hebrewToLxxPsalm(oldChapter);
}
