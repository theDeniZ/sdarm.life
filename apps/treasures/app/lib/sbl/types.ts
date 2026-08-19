/* The shapes app.sdarm.org serves. Written from the live payloads
 * (en-2026-3.json and en-kjv.json), not from a specification: nearly every
 * field is optional there, and the engine already reads them defensively, so
 * they are optional here too rather than asserted and hoped for. */

export type Dict = Record<string, string>;
/* key → language → text; how every label table in the engine is shaped */
export type Phrase = Record<string, Dict>;

/** A run of text inside a question or a note. `sOsis` is the Bible reference
 *  it points at ("Exod.34.6-Exod.34.7"), absent on plain prose. */
export interface Piece {
  text?: string;
  sOsis?: string;
  label?: string;
}

/** Source of a Spirit of Prophecy quote. English data keeps it apart; the
 *  German and Russian editions carry it inside the text itself. */
export interface Sop {
  label?: string;
  ref?: string;
}

export interface NotePiece {
  text?: string;
  sop?: Sop;
}

export interface Subsection {
  q?: Piece[];
  question?: Piece[];
  note?: NotePiece[];
}

export interface DailyLesson {
  date: string;
  dayLong?: string;
  monthDay?: string;
  sectionTitle?: string;
  subsections?: Subsection[];
  reviewQuestions?: string[];
}

export interface Lesson {
  no?: string;
  date: string;
  dateLong?: string;
  header?: string;
  title?: string;
  keyTextVerse?: string;
  keyTextRef?: string;
  keyText?: { text?: string; ref?: { text?: string; sOsis?: string } };
  keyNote?: { text?: string; sop?: Sop };
  reading?: { label?: string; reading?: { label?: string; ref?: string }[] };
  dailyLessons?: DailyLesson[];
}

export interface Quarter {
  title?: string;
  lang?: string;
  year?: number;
  quarter?: number;
  lessons?: Lesson[];
}

/** A Bible edition's text: book code → chapters → verses. A verse may be
 *  missing in an edition, which is why the innermost entry is nullable. */
export type BibleBooks = Record<string, (string | null)[][]>;

/** One Bible file as app.sdarm.org serves it — about four megabytes. */
export interface BibleEdition {
  id?: string;
  version?: string;
  lang?: string;
  name?: string;
  updated?: string;
  books: BibleBooks;
}

/** One passage the sheet is waiting for:
 *  [box id, reference, second-column box id, edition-label id, edition]. */
export type VerseTask = [string, string, string, string, string];

/* What the pencil keeps, per lesson and per language, in localStorage.
 * Positions are character offsets inside a block of the sheet, counted over its
 * text nodes — which is why a mark survives a re-render and prints with the
 * text instead of floating over it. */

/** The nesting of marks a text node sits under, outermost first. */
export type MarkChain = { c?: string; y?: string }[];

export interface MarkRecord {
  k?: string;
  s: number;
  e: number;
  ch: MarkChain;
}

export interface InsRecord {
  k?: string;
  s: number;
  t: string | null;
  h: string;
}

export interface NoteRecord {
  k: string;
  t: string;
  c?: string;
}

export interface PageMarks {
  marks: MarkRecord[];
  ins: InsRecord[];
  notes: NoteRecord[];
}

/** Where a stroke stands: the block it is in, and the span of characters. */
export interface MarkSpan {
  block: HTMLElement;
  from: number;
  to: number;
}
