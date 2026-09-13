/**
 * Source book code -> USFM.
 *
 * The `bible-data/*.json` files key their verses as `Gen.1.1` — OSIS-ish short
 * forms. Everything downstream (the API routes, the reader URLs, the parallel
 * view, the YouVersion-sourced translations that sit beside these) speaks USFM,
 * so the mapping happens once, here, at ingest.
 *
 * `number` is the canonical Protestant order 1..66 and is the same for every
 * translation, including the Synodal text, whose own running order puts the
 * catholic epistles before Paul. That order is a presentation of the same 66
 * books; normalising it keeps the OT/NT tabs and the book grid stable across
 * languages.
 */

export type Testament = 'OT' | 'NT';

export interface BookMeta {
  /** USFM code written to `bible_books.code`. */
  usfm: string;
  /** Canonical Protestant number, 1..66. */
  number: number;
  testament: Testament;
}

/** Keyed by the exact book segment used in the source JSON keys. */
export const BOOKS: Record<string, BookMeta> = {
  Gen: { usfm: 'GEN', number: 1, testament: 'OT' },
  Exod: { usfm: 'EXO', number: 2, testament: 'OT' },
  Lev: { usfm: 'LEV', number: 3, testament: 'OT' },
  Num: { usfm: 'NUM', number: 4, testament: 'OT' },
  Deut: { usfm: 'DEU', number: 5, testament: 'OT' },
  Josh: { usfm: 'JOS', number: 6, testament: 'OT' },
  Judg: { usfm: 'JDG', number: 7, testament: 'OT' },
  Ruth: { usfm: 'RUT', number: 8, testament: 'OT' },
  '1Sam': { usfm: '1SA', number: 9, testament: 'OT' },
  '2Sam': { usfm: '2SA', number: 10, testament: 'OT' },
  '1Kgs': { usfm: '1KI', number: 11, testament: 'OT' },
  '2Kgs': { usfm: '2KI', number: 12, testament: 'OT' },
  '1Chr': { usfm: '1CH', number: 13, testament: 'OT' },
  '2Chr': { usfm: '2CH', number: 14, testament: 'OT' },
  Ezra: { usfm: 'EZR', number: 15, testament: 'OT' },
  Neh: { usfm: 'NEH', number: 16, testament: 'OT' },
  Esth: { usfm: 'EST', number: 17, testament: 'OT' },
  Job: { usfm: 'JOB', number: 18, testament: 'OT' },
  Ps: { usfm: 'PSA', number: 19, testament: 'OT' },
  Prov: { usfm: 'PRO', number: 20, testament: 'OT' },
  Eccl: { usfm: 'ECC', number: 21, testament: 'OT' },
  Song: { usfm: 'SNG', number: 22, testament: 'OT' },
  Isa: { usfm: 'ISA', number: 23, testament: 'OT' },
  Jer: { usfm: 'JER', number: 24, testament: 'OT' },
  Lam: { usfm: 'LAM', number: 25, testament: 'OT' },
  Ezek: { usfm: 'EZK', number: 26, testament: 'OT' },
  Dan: { usfm: 'DAN', number: 27, testament: 'OT' },
  Hos: { usfm: 'HOS', number: 28, testament: 'OT' },
  Joel: { usfm: 'JOL', number: 29, testament: 'OT' },
  Amos: { usfm: 'AMO', number: 30, testament: 'OT' },
  Obad: { usfm: 'OBA', number: 31, testament: 'OT' },
  Jonah: { usfm: 'JON', number: 32, testament: 'OT' },
  Mic: { usfm: 'MIC', number: 33, testament: 'OT' },
  Nah: { usfm: 'NAM', number: 34, testament: 'OT' },
  Hab: { usfm: 'HAB', number: 35, testament: 'OT' },
  Zeph: { usfm: 'ZEP', number: 36, testament: 'OT' },
  Hag: { usfm: 'HAG', number: 37, testament: 'OT' },
  Zech: { usfm: 'ZEC', number: 38, testament: 'OT' },
  Mal: { usfm: 'MAL', number: 39, testament: 'OT' },
  Matt: { usfm: 'MAT', number: 40, testament: 'NT' },
  Mark: { usfm: 'MRK', number: 41, testament: 'NT' },
  Luke: { usfm: 'LUK', number: 42, testament: 'NT' },
  John: { usfm: 'JHN', number: 43, testament: 'NT' },
  Acts: { usfm: 'ACT', number: 44, testament: 'NT' },
  Rom: { usfm: 'ROM', number: 45, testament: 'NT' },
  '1Cor': { usfm: '1CO', number: 46, testament: 'NT' },
  '2Cor': { usfm: '2CO', number: 47, testament: 'NT' },
  Gal: { usfm: 'GAL', number: 48, testament: 'NT' },
  Eph: { usfm: 'EPH', number: 49, testament: 'NT' },
  Phil: { usfm: 'PHP', number: 50, testament: 'NT' },
  Col: { usfm: 'COL', number: 51, testament: 'NT' },
  '1Thess': { usfm: '1TH', number: 52, testament: 'NT' },
  '2Thess': { usfm: '2TH', number: 53, testament: 'NT' },
  '1Tim': { usfm: '1TI', number: 54, testament: 'NT' },
  '2Tim': { usfm: '2TI', number: 55, testament: 'NT' },
  Titus: { usfm: 'TIT', number: 56, testament: 'NT' },
  Phlm: { usfm: 'PHM', number: 57, testament: 'NT' },
  Heb: { usfm: 'HEB', number: 58, testament: 'NT' },
  Jas: { usfm: 'JAS', number: 59, testament: 'NT' },
  '1Pet': { usfm: '1PE', number: 60, testament: 'NT' },
  '2Pet': { usfm: '2PE', number: 61, testament: 'NT' },
  '1John': { usfm: '1JN', number: 62, testament: 'NT' },
  '2John': { usfm: '2JN', number: 63, testament: 'NT' },
  '3John': { usfm: '3JN', number: 64, testament: 'NT' },
  Jude: { usfm: 'JUD', number: 65, testament: 'NT' },
  Rev: { usfm: 'REV', number: 66, testament: 'NT' },
};

/** USFM codes in canonical order — the order `bible_books` rows are written in. */
export const USFM_ORDER: string[] = Object.values(BOOKS)
  .sort((a, b) => a.number - b.number)
  .map((b) => b.usfm);

/**
 * Resolve a source book code. Throws rather than returning undefined: a code we
 * do not know is a book silently missing from a translation, which reads as a
 * successful ingest and shows up months later as a 404 on Philemon.
 */
export function toUsfm(sourceCode: string): BookMeta {
  const meta = BOOKS[sourceCode];
  if (!meta) {
    throw new Error(`Unmapped book code '${sourceCode}' — add it to scripts/bible/usfm.ts before re-running.`);
  }
  return meta;
}
