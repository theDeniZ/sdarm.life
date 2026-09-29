'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { remapPsalmChapter } from '@sdarm/types';
import type { BibleBook, BibleTranslation, ParallelChapter } from '../../lib/bible';
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALES,
  readFontScale,
  writeFontScale,
  writeLastRead,
  type FontScale,
} from './lastRead';
import BiblePresenterDashboard from './BiblePresenterDashboard';
import { displayUrl, openDisplayWindow } from './presenterWindow';
import BibleLicenseNotice from './BibleLicenseNotice';

interface Props {
  translationA: BibleTranslation;
  translationB: BibleTranslation;
  translations: BibleTranslation[];
  books: BibleBook[];
  parallel: ParallelChapter;
  /** API base for the presenter's client-side fetches. */
  apiUrl: string;
  /**
   * Translations the presenter starts with, primary first — the pair shown
   * here, or the longer list a `?with=` URL named.
   */
  presenterCodes: string[];
}

export default function BibleParallelReader({
  translationA,
  translationB,
  translations,
  books,
  parallel,
  apiUrl,
  presenterCodes,
}: Props) {
  const [sideA, sideB] = parallel.translations;
  const t = useTranslations('treasures.bible');
  const locale = useLocale();
  const router = useRouter();

  // Stored font scale is read after mount to keep SSR and client HTML identical.
  const [fontScale, setFontScale] = useState<FontScale>(DEFAULT_FONT_SCALE);
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const displayWinRef = useRef<Window | null>(null);

  const currentBook = useMemo(
    () => books.find((b) => b.code === parallel.bookCode) ?? null,
    [books, parallel.bookCode]
  );
  const bookIdx = currentBook ? books.indexOf(currentBook) : -1;

  const prev = useMemo(() => {
    if (!currentBook) return null;
    if (sideA.chapter > 1) return { book: currentBook.code, n: sideA.chapter - 1 };
    if (bookIdx > 0) {
      const prevBook = books[bookIdx - 1];
      return { book: prevBook.code, n: prevBook.chapterCount };
    }
    return null;
  }, [bookIdx, books, currentBook, sideA.chapter]);

  const next = useMemo(() => {
    if (!currentBook) return null;
    if (sideA.chapter < currentBook.chapterCount) return { book: currentBook.code, n: sideA.chapter + 1 };
    if (bookIdx < books.length - 1) {
      const nextBook = books[bookIdx + 1];
      return { book: nextBook.code, n: 1 };
    }
    return null;
  }, [bookIdx, books, currentBook, sideA.chapter]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFontScale(readFontScale());
  }, []);

  // Save last-read (using A as canonical)
  useEffect(() => {
    writeLastRead({
      translationCode: translationA.code,
      translationName: translationA.name,
      bookCode: parallel.bookCode,
      bookName: currentBook?.name ?? parallel.bookCode,
      chapter: sideA.chapter,
      savedAt: Date.now(),
    });
  }, [translationA.code, translationA.name, parallel.bookCode, sideA.chapter, currentBook]);

  // Keyboard: ←/→ for chapters
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select') || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // See BibleChapterReader: the presenter portal renders over this reader
      // without unmounting it, so both would handle the same arrow key.
      if (presenterOpen) return;
      if (e.key === 'ArrowLeft' && prev) {
        e.preventDefault();
        router.push(buildHref(translationA.code, prev.book, prev.n, translationB.code));
      } else if (e.key === 'ArrowRight' && next) {
        e.preventDefault();
        router.push(buildHref(translationA.code, next.book, next.n, translationB.code));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, prev, next, router, translationA.code, translationB.code, presenterOpen]);

  function buildHref(codeA: string, bookCode: string, chapter: number, codeB?: string | null) {
    const base = `/${locale}/bible/${codeA}/${bookCode}/${chapter}`;
    return codeB ? `${base}?compare=${codeB}` : base;
  }

  function handleFontStep(direction: 1 | -1) {
    const idx = FONT_SCALES.indexOf(fontScale);
    const nextIdx = Math.max(0, Math.min(FONT_SCALES.length - 1, idx + direction));
    const nv = FONT_SCALES[nextIdx];
    setFontScale(nv);
    writeFontScale(nv);
  }

  function handleSwap() {
    // After swap, B becomes A — the URL chapter is now in B's numbering (which becomes new A's).
    router.push(buildHref(translationB.code, parallel.bookCode, sideB.chapter, translationA.code));
  }

  function handleSingleView() {
    router.push(buildHref(translationA.code, parallel.bookCode, sideA.chapter));
  }

  // Build a minimal BibleChapter for the dashboard (it uses chapter only for
  // breadcrumbs in parallel mode — verse text comes from `parallel`).
  async function openDisplay(codes: string[], bookCode: string, chapterNum: number) {
    displayWinRef.current = await openDisplayWindow(
      displayUrl(locale, codes, bookCode, chapterNum),
      displayWinRef.current
    );
  }

  async function openPresenter() {
    setPresenterOpen(true);
    await openDisplay(presenterCodes, parallel.bookCode, sideA.chapter);
  }

  function closePresenter() {
    // Keep the display window alive across dashboard re-opens (see ChapterReader) —
    // which means keeping the handle too, otherwise the next openPresenter()
    // spawns a second window and the first is left orphaned on screen.
    setPresenterOpen(false);
  }

  function handlePickA(e: React.ChangeEvent<HTMLSelectElement>) {
    // Preserve content when switching A's translation: remap chapter through canonical Hebrew Psalm numbering.
    const newCode = e.target.value;
    const newTranslation = translations.find((tr) => tr.code === newCode);
    const newChapter = remapPsalmChapter(
      translationA.lxxPsalms,
      newTranslation?.lxxPsalms ?? translationA.lxxPsalms,
      parallel.bookCode,
      sideA.chapter
    );
    router.push(buildHref(newCode, parallel.bookCode, newChapter, translationB.code));
  }

  function handlePickB(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildHref(translationA.code, parallel.bookCode, sideA.chapter, e.target.value));
  }

  function handleBookChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildHref(translationA.code, e.target.value, 1, translationB.code));
  }

  function handleChapterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildHref(translationA.code, parallel.bookCode, Number(e.target.value), translationB.code));
  }

  async function handleVerseClick(verse: number) {
    setHighlightedVerse((cur) => (cur === verse ? null : verse));
    const url = `${window.location.origin}${buildHref(translationA.code, parallel.bookCode, sideA.chapter, translationB.code)}#v${verse}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('linkCopied'));
    } catch {
      // ignore
    }
  }

  const sameTranslation = translationA.code === translationB.code;
  const allowProjector = translationA.license.allowProjector && translationB.license.allowProjector;

  return (
    <div className="bible-reader bible-parallel" style={{ fontSize: `${fontScale}rem` }}>
      <nav className="bible-reader-breadcrumb">
        <Link href={`/${locale}/bible`} className="bible-back-link">
          {t('homeLink')}
        </Link>
        <span className="bible-breadcrumb-sep">/</span>
        <span className="bible-breadcrumb-current">
          {currentBook?.name ?? parallel.bookCode} {sideA.chapter}
        </span>
      </nav>

      {sameTranslation && <p className="bible-empty">{t('sameTranslation')}</p>}

      <div className="bible-reader-navbar" aria-label={t('ariaChapterNav')}>
        <Link
          href={prev ? buildHref(translationA.code, prev.book, prev.n, translationB.code) : '#'}
          className={`bible-nav-btn${prev ? '' : ' disabled'}`}
          aria-disabled={!prev}
          onClick={(e) => !prev && e.preventDefault()}
          aria-label={t('previousChapter')}
        >
          ←
        </Link>

        <div className="bible-reader-pickers">
          <select
            value={parallel.bookCode}
            onChange={handleBookChange}
            className="bible-picker"
            aria-label={t('pickBook')}
          >
            {books.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
          {currentBook && (
            <select
              value={sideA.chapter}
              onChange={handleChapterChange}
              className="bible-picker bible-picker-chapter"
              aria-label={t('pickChapter')}
            >
              {Array.from({ length: currentBook.chapterCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </div>

        <Link
          href={next ? buildHref(translationA.code, next.book, next.n, translationB.code) : '#'}
          className={`bible-nav-btn${next ? '' : ' disabled'}`}
          aria-disabled={!next}
          onClick={(e) => !next && e.preventDefault()}
          aria-label={t('nextChapter')}
        >
          →
        </Link>
      </div>

      <div className="bible-parallel-grid">
        <div className="bible-parallel-grid__row bible-parallel-grid__row--header">
          <span className="bible-parallel-grid__num-spacer" aria-hidden="true" />
          <header className="bible-parallel-grid__col-header">
            <select
              value={translationA.code}
              onChange={handlePickA}
              className="bible-picker"
              aria-label={t('pickTranslation')}
            >
              {translations.map((tr) => (
                <option key={tr.code} value={tr.code}>
                  {tr.name}
                </option>
              ))}
            </select>
            <div className="bible-parallel-col-chapter">{t('chapter', { n: sideA.chapter })}</div>
          </header>
          <header className="bible-parallel-grid__col-header">
            <select
              value={translationB.code}
              onChange={handlePickB}
              className="bible-picker"
              aria-label={t('pickTranslation')}
            >
              {translations.map((tr) => (
                <option key={tr.code} value={tr.code}>
                  {tr.name}
                </option>
              ))}
            </select>
            <div className="bible-parallel-col-chapter">{t('chapter', { n: sideB.chapter })}</div>
          </header>
        </div>
        {parallel.verses.map((v) => {
          const isHighlighted = highlightedVerse === v.verse;
          return (
            <div
              key={v.verse}
              className={`bible-parallel-grid__row${isHighlighted ? ' is-highlighted' : ''}`}
              onClick={() => (v.texts[0] != null || v.texts[1] != null) && handleVerseClick(v.verse)}
            >
              <span className="bible-parallel-grid__num">{v.verse}</span>
              <span
                className={`bible-parallel-grid__text${v.texts[0] == null ? ' bible-parallel-grid__text--empty' : ''}`}
              >
                {v.texts[0] ?? '—'}
              </span>
              <span
                className={`bible-parallel-grid__text${v.texts[1] == null ? ' bible-parallel-grid__text--empty' : ''}`}
              >
                {v.texts[1] ?? '—'}
              </span>
            </div>
          );
        })}
      </div>

      <BibleLicenseNotice
        sources={[
          { name: sideA.name, license: sideA.license },
          { name: sideB.name, license: sideB.license },
        ]}
      />

      <div className="bible-action-bar">
        <button
          type="button"
          className="bible-action-btn"
          onClick={() => handleFontStep(-1)}
          disabled={fontScale === FONT_SCALES[0]}
          aria-label={t('fontSmaller')}
        >
          A−
        </button>
        <button
          type="button"
          className="bible-action-btn"
          onClick={() => handleFontStep(1)}
          disabled={fontScale === FONT_SCALES[FONT_SCALES.length - 1]}
          aria-label={t('fontLarger')}
        >
          A+
        </button>
        <button type="button" className="bible-action-btn" onClick={handleSwap} aria-label={t('swapColumns')}>
          {t('swapAB')}
        </button>
        {/* Both texts land on the same screen, so the stricter of the two
            decides: one translation that forbids projection forbids the pair. */}
        {allowProjector && (
          <button type="button" className="bible-action-btn" onClick={openPresenter} disabled={presenterOpen}>
            {t('presenter')}
          </button>
        )}
        <button type="button" className="bible-action-btn" onClick={handleSingleView}>
          {t('exitParallel')}
        </button>
      </div>

      {presenterOpen && (
        <BiblePresenterDashboard
          locale={locale}
          apiUrl={apiUrl}
          translations={translations}
          initialCodes={presenterCodes}
          bookCode={parallel.bookCode}
          chapter={sideA.chapter}
          initialBooks={books}
          onOpenDisplay={openDisplay}
          onClose={closePresenter}
        />
      )}

      {toast && (
        <div className="bible-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
