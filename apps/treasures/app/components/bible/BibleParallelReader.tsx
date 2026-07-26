'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { remapPsalmChapter } from '@sdarm/types';
import type { BibleBook, BibleChapter, BibleTranslation, ParallelChapter } from '../../lib/bible';
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALES,
  readFontScale,
  writeFontScale,
  writeLastRead,
  type FontScale,
} from './lastRead';
import BiblePresenterDashboard from './BiblePresenterDashboard';
import type { PassageTarget } from './BiblePassagePicker';

interface Props {
  translationA: BibleTranslation;
  translationB: BibleTranslation;
  translations: BibleTranslation[];
  books: BibleBook[];
  parallel: ParallelChapter;
}

export default function BibleParallelReader({ translationA, translationB, translations, books, parallel }: Props) {
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
    if (parallel.a.chapter > 1) return { book: currentBook.code, n: parallel.a.chapter - 1 };
    if (bookIdx > 0) {
      const prevBook = books[bookIdx - 1];
      return { book: prevBook.code, n: prevBook.chapterCount };
    }
    return null;
  }, [bookIdx, books, currentBook, parallel.a.chapter]);

  const next = useMemo(() => {
    if (!currentBook) return null;
    if (parallel.a.chapter < currentBook.chapterCount) return { book: currentBook.code, n: parallel.a.chapter + 1 };
    if (bookIdx < books.length - 1) {
      const nextBook = books[bookIdx + 1];
      return { book: nextBook.code, n: 1 };
    }
    return null;
  }, [bookIdx, books, currentBook, parallel.a.chapter]);

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
      chapter: parallel.a.chapter,
      savedAt: Date.now(),
    });
  }, [translationA.code, translationA.name, parallel.bookCode, parallel.a.chapter, currentBook]);

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
    router.push(buildHref(translationB.code, parallel.bookCode, parallel.b.chapter, translationA.code));
  }

  function handleSingleView() {
    router.push(buildHref(translationA.code, parallel.bookCode, parallel.a.chapter));
  }

  // Build a minimal BibleChapter for the dashboard (it uses chapter only for
  // breadcrumbs in parallel mode — verse text comes from `parallel`).
  const synthChapter: BibleChapter = useMemo(
    () => ({
      translation: { code: translationA.code, name: translationA.name, copyright: translationA.copyright },
      book: currentBook ?? {
        id: 0,
        code: parallel.bookCode,
        number: 0,
        name: parallel.bookCode,
        abbreviation: parallel.bookCode,
        testament: 'OT',
        chapterCount: 1,
      },
      chapter: parallel.a.chapter,
      verses: parallel.verses.map((v) => ({ verse: v.verse, text: v.a ?? v.b ?? '' })),
    }),
    [translationA.code, translationA.name, translationA.copyright, currentBook, parallel]
  );

  async function openPresenter() {
    let features = `width=${screen.availWidth},height=${screen.availHeight},left=${
      (screen as Screen & { availLeft?: number }).availLeft ?? 0
    },top=${(screen as Screen & { availTop?: number }).availTop ?? 0}`;
    try {
      type ScreenInfo = {
        availLeft: number;
        availTop: number;
        availWidth: number;
        availHeight: number;
        isPrimary: boolean;
      };
      const details = await (
        window as Window & { getScreenDetails?: () => Promise<{ screens: ScreenInfo[] }> }
      ).getScreenDetails?.();
      const external = details?.screens.find((s) => !s.isPrimary) ?? details?.screens[0];
      if (external) {
        features = `width=${external.availWidth},height=${external.availHeight},left=${external.availLeft},top=${external.availTop}`;
      }
    } catch {
      // fall back to current screen dimensions
    }
    const projectorUrl = `/${locale}/bible/${translationA.code}/${parallel.bookCode}/${parallel.a.chapter}?projector=1&compare=${translationB.code}`;
    const win = window.open(projectorUrl, 'bible-projector-display', features);
    displayWinRef.current = win;
    setPresenterOpen(true);
  }

  function closePresenter() {
    // Keep the display window alive across dashboard re-opens (see ChapterReader) —
    // which means keeping the handle too, otherwise the next openPresenter()
    // spawns a second window and the first is left orphaned on screen.
    setPresenterOpen(false);
  }

  function handlePresenterPick(target: PassageTarget) {
    // The dashboard has already told the display to navigate; closing the window
    // here would black out the projector mid-service. Matches BibleChapterReader.
    setPresenterOpen(false);
    const verseSuffix = target.verse !== undefined ? `#v${target.verse}` : '';
    router.push(
      `/${locale}/bible/${translationA.code}/${target.bookCode}/${target.chapter}?compare=${translationB.code}${verseSuffix}`
    );
  }

  function handlePresenterCompare(secondaryCode: string | null) {
    if (!secondaryCode) {
      // Switch to single view
      closePresenter();
      router.push(buildHref(translationA.code, parallel.bookCode, parallel.a.chapter));
      return;
    }
    // Reload display window + push the operator window URL.
    const win = displayWinRef.current;
    if (win && !win.closed) {
      const params = new URLSearchParams({ projector: '1', compare: secondaryCode });
      win.location.assign(
        `/${locale}/bible/${translationA.code}/${parallel.bookCode}/${parallel.a.chapter}?${params.toString()}`
      );
    }
    router.push(buildHref(translationA.code, parallel.bookCode, parallel.a.chapter, secondaryCode));
  }

  function handlePickA(e: React.ChangeEvent<HTMLSelectElement>) {
    // Preserve content when switching A's translation: remap chapter through canonical Hebrew Psalm numbering.
    const newCode = e.target.value;
    const newTranslation = translations.find((tr) => tr.code === newCode);
    const newChapter = remapPsalmChapter(
      translationA.lxxPsalms,
      newTranslation?.lxxPsalms ?? translationA.lxxPsalms,
      parallel.bookCode,
      parallel.a.chapter
    );
    router.push(buildHref(newCode, parallel.bookCode, newChapter, translationB.code));
  }

  function handlePickB(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildHref(translationA.code, parallel.bookCode, parallel.a.chapter, e.target.value));
  }

  function handleBookChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildHref(translationA.code, e.target.value, 1, translationB.code));
  }

  function handleChapterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildHref(translationA.code, parallel.bookCode, Number(e.target.value), translationB.code));
  }

  async function handleVerseClick(verse: number) {
    setHighlightedVerse((cur) => (cur === verse ? null : verse));
    const url = `${window.location.origin}${buildHref(translationA.code, parallel.bookCode, parallel.a.chapter, translationB.code)}#v${verse}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('linkCopied'));
    } catch {
      // ignore
    }
  }

  const sameTranslation = translationA.code === translationB.code;

  return (
    <div className="bible-reader bible-parallel" style={{ fontSize: `${fontScale}rem` }}>
      <nav className="bible-reader-breadcrumb">
        <Link href={`/${locale}/bible`} className="bible-back-link">
          {t('homeLink')}
        </Link>
        <span className="bible-breadcrumb-sep">/</span>
        <span className="bible-breadcrumb-current">
          {currentBook?.name ?? parallel.bookCode} {parallel.a.chapter}
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
              value={parallel.a.chapter}
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
            <div className="bible-parallel-col-chapter">{t('chapter', { n: parallel.a.chapter })}</div>
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
            <div className="bible-parallel-col-chapter">{t('chapter', { n: parallel.b.chapter })}</div>
          </header>
        </div>
        {parallel.verses.map((v) => {
          const isHighlighted = highlightedVerse === v.verse;
          return (
            <div
              key={v.verse}
              className={`bible-parallel-grid__row${isHighlighted ? ' is-highlighted' : ''}`}
              onClick={() => (v.a != null || v.b != null) && handleVerseClick(v.verse)}
            >
              <span className="bible-parallel-grid__num">{v.verse}</span>
              <span className={`bible-parallel-grid__text${v.a == null ? ' bible-parallel-grid__text--empty' : ''}`}>
                {v.a ?? '—'}
              </span>
              <span className={`bible-parallel-grid__text${v.b == null ? ' bible-parallel-grid__text--empty' : ''}`}>
                {v.b ?? '—'}
              </span>
            </div>
          );
        })}
      </div>

      {(parallel.a.copyright || parallel.b.copyright) && (
        <p className="bible-copyright">{[parallel.a.copyright, parallel.b.copyright].filter(Boolean).join(' · ')}</p>
      )}

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
        <button type="button" className="bible-action-btn" onClick={openPresenter} disabled={presenterOpen}>
          {t('presenter')}
        </button>
        <button type="button" className="bible-action-btn" onClick={handleSingleView}>
          {t('exitParallel')}
        </button>
      </div>

      {presenterOpen && (
        <BiblePresenterDashboard
          chapter={synthChapter}
          books={books}
          locale={locale}
          translations={translations}
          parallel={parallel}
          compareCode={translationB.code}
          onClose={closePresenter}
          onPickPassage={handlePresenterPick}
          onCompareChange={handlePresenterCompare}
          onTranslationChange={(code) =>
            router.push(buildHref(code, parallel.bookCode, parallel.a.chapter, translationB.code))
          }
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
