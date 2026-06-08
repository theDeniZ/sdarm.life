'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BibleBook } from '../../lib/bible';

export interface PassageTarget {
  bookCode: string;
  bookName: string;
  chapter: number;
  verse?: number;
}

interface Props {
  books: BibleBook[];
  onPick: (target: PassageTarget) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Optional initial query (e.g. preserved across opens). */
  initialQuery?: string;
  /** Optional render variant — defaults to a regular input + dropdown. */
  variant?: 'input' | 'compact';
}

interface PickerResult {
  book: BibleBook;
  chapter: number;
  verse?: number;
  /** Lower is better. Used for ordering matches. */
  rank: number;
  /** Why this match was offered — drives the secondary label in the dropdown. */
  hint: 'chapter-only' | 'book' | 'book-chapter' | 'book-verse';
}

const MAX_RESULTS = 8;

// Parse `Book N`, `Book N:V`, `Book N,V`, `Book N.V` — book fragment may include
// digits (e.g. `1 John`, `2 Mose`). The chapter+verse trailing block is
// captured greedily-from-the-end so book fragments stay intact.
const REF_RE = /^(.+?)\s+(\d+)(?:\s*[:.,]\s*(\d+))?\s*$/;
const NUM_RE = /^\d+$/;

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchBookFragment(fragment: string, books: BibleBook[]): { book: BibleBook; rank: number }[] {
  const q = normalize(fragment);
  if (!q) return [];
  const out: { book: BibleBook; rank: number }[] = [];
  for (const b of books) {
    const name = normalize(b.name);
    const abbr = normalize(b.abbreviation);
    const code = normalize(b.code);
    let rank = -1;
    if (abbr === q || code === q) rank = 0;
    else if (name === q) rank = 1;
    else if (name.startsWith(q)) rank = 2;
    else if (abbr.startsWith(q) || code.startsWith(q)) rank = 3;
    else if (name.includes(q)) rank = 4;
    else if (abbr.includes(q) || code.includes(q)) rank = 5;
    if (rank >= 0) out.push({ book: b, rank });
  }
  return out.sort((a, b) => a.rank - b.rank || a.book.number - b.book.number);
}

function parseQuery(query: string, books: BibleBook[]): PickerResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Bare number → list books that have at least N chapters, deep-linking to chapter N.
  if (NUM_RE.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    if (n < 1) return [];
    return books
      .filter((b) => b.chapterCount >= n)
      .map<PickerResult>((b) => ({ book: b, chapter: n, rank: b.number, hint: 'chapter-only' }))
      .slice(0, MAX_RESULTS);
  }

  // `Book N` or `Book N:V` — explicit reference.
  const ref = REF_RE.exec(trimmed);
  if (ref) {
    const [, bookFrag, chStr, vStr] = ref;
    const ch = parseInt(chStr, 10);
    const verse = vStr ? parseInt(vStr, 10) : undefined;
    const matches = matchBookFragment(bookFrag, books).filter(({ book }) => ch >= 1 && ch <= book.chapterCount);
    return matches.slice(0, MAX_RESULTS).map<PickerResult>(({ book, rank }) => ({
      book,
      chapter: ch,
      verse,
      rank,
      hint: verse !== undefined ? 'book-verse' : 'book-chapter',
    }));
  }

  // Plain text — fuzzy book match, default to chapter 1.
  return matchBookFragment(trimmed, books)
    .slice(0, MAX_RESULTS)
    .map<PickerResult>(({ book, rank }) => ({ book, chapter: 1, rank, hint: 'book' }));
}

export default function BiblePassagePicker({
  books,
  onPick,
  placeholder,
  autoFocus = false,
  initialQuery = '',
  variant = 'input',
}: Props) {
  const t = useTranslations('treasures.bible');
  const [query, setQuery] = useState(initialQuery);
  const [focusIdx, setFocusIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const results = useMemo(() => parseQuery(query, books), [query, books]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusIdx(0);
  }, [query]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function commit(result: PickerResult) {
    onPick({
      bookCode: result.book.code,
      bookName: result.book.name,
      chapter: result.chapter,
      verse: result.verse,
    });
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setFocusIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const choice = results[focusIdx];
      if (choice) commit(choice);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showResults = open && results.length > 0;
  const placeholderText = placeholder ?? t('passagePickerPlaceholder');
  // Announce result count for screen readers when the query changes.
  const announce = query.trim()
    ? results.length === 0
      ? t('passagePickerNoMatches')
      : t('passagePickerResultsCount', { count: results.length })
    : '';

  return (
    <div className={`bible-passage-picker bible-passage-picker--${variant}`}>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={showResults}
        aria-autocomplete="list"
        aria-activedescendant={showResults ? `${listboxId}-${focusIdx}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={placeholderText}
        aria-label={placeholderText}
        className="bible-passage-picker__input"
        autoComplete="off"
        spellCheck={false}
      />
      <span className="bible-passage-picker__sr-status" role="status" aria-live="polite" aria-atomic="true">
        {announce}
      </span>
      {showResults && (
        <ul role="listbox" id={listboxId} className="bible-passage-picker__list">
          {results.map((r, i) => {
            const refLabel =
              r.hint === 'book'
                ? r.book.name
                : r.hint === 'book-verse'
                  ? `${r.book.name} ${r.chapter}:${r.verse}`
                  : `${r.book.name} ${r.chapter}`;
            const meta =
              r.hint === 'chapter-only'
                ? t('passagePickerChapterOf', { count: r.book.chapterCount })
                : r.hint === 'book'
                  ? t('passagePickerOpenBook', { count: r.book.chapterCount })
                  : t('passagePickerJump');
            return (
              <li
                key={`${r.book.code}-${r.chapter}-${r.verse ?? ''}`}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={i === focusIdx}
                className={`bible-passage-picker__item${i === focusIdx ? ' is-focused' : ''}`}
                onMouseEnter={() => setFocusIdx(i)}
                onMouseDown={(e) => {
                  // mousedown fires before blur — prevents the blur handler from closing the list first
                  e.preventDefault();
                  commit(r);
                }}
              >
                <span className="bible-passage-picker__ref">{refLabel}</span>
                <span className="bible-passage-picker__meta">{meta}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
