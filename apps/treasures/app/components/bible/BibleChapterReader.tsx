'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { BibleBook, BibleChapter, BibleTranslation, ParallelChapter } from '../../lib/bible';
import { fetchParallelChapter } from '../../lib/bible';
import {
  buildCopyText,
  DEFAULT_COPY_OPTIONS,
  readCopyOptions,
  shortTranslationName,
  writeCopyOptions,
  type CopyOptions,
  type LinkStyle,
} from '../../lib/copyVerses';
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALES,
  readFontScale,
  writeFontScale,
  writeLastRead,
  type FontScale,
} from './lastRead';
import BiblePresenterDashboard from './BiblePresenterDashboard';
import BiblePassagePicker, { type PassageTarget } from './BiblePassagePicker';

interface Props {
  translation: BibleTranslation;
  translations: BibleTranslation[];
  books: BibleBook[];
  chapter: BibleChapter;
  /** API base URL for client-side fetches (server env is not available in the browser). */
  apiUrl: string;
}

// Language-neutral compact labels for the copy-options radio pills. The full
// translated description is always available via the title attribute.
const PILL_SYMBOL: Record<string, string> = {
  copyVerseNumberStyle_none: '—',
  copyVerseNumberStyle_plain: '1.',
  copyVerseNumberStyle_superscript: 'x¹',
  copyVerseNumberStyle_bracket: '[1]',
  copyReferencePosition_top: '↑',
  copyReferencePosition_bottom: '↓',
  copyQuoteStyle_none: '—',
  copyQuoteStyle_curly: '“…”',
  copyQuoteStyle_german: '„…“',
  copyQuoteStyle_guillemets: '«…»',
  copyLinkStyle_none: '—',
  copySeparator_newline: '¶',
  copySeparator_space: '∙∙',
};

export default function BibleChapterReader({ translation, translations, books, chapter, apiUrl }: Props) {
  const t = useTranslations('treasures.bible');
  const locale = useLocale();
  const router = useRouter();

  // Stored preferences are read after mount — the SSR pass must render with
  // defaults, otherwise server and client HTML disagree (hydration error).
  const [fontScale, setFontScale] = useState<FontScale>(DEFAULT_FONT_SCALE);
  const [copyOptions, setCopyOptions] = useState<CopyOptions>(DEFAULT_COPY_OPTIONS);
  const [selectedVerses, setSelectedVerses] = useState<ReadonlySet<number>>(() => new Set());
  const anchorRef = useRef<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [multiScreen, setMultiScreen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compareCode, setCompareCode] = useState<string | null>(null);
  const [parallelChapter, setParallelChapter] = useState<ParallelChapter | null>(null);
  const [copyOptionsOpen, setCopyOptionsOpen] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; verseNum: number } | null>(null);
  const displayWinRef = useRef<Window | null>(null);
  const versesRef = useRef<Map<number, HTMLLIElement>>(new Map());

  const bookIdx = useMemo(() => books.findIndex((b) => b.code === chapter.book.code), [books, chapter.book.code]);
  const currentBook = bookIdx >= 0 ? books[bookIdx] : null;
  const sortedVerseNumbers = useMemo(() => chapter.verses.map((v) => v.verse).sort((a, b) => a - b), [chapter.verses]);

  const prev = useMemo(() => {
    if (!currentBook) return null;
    if (chapter.chapter > 1) return { book: currentBook.code, n: chapter.chapter - 1 };
    if (bookIdx > 0) {
      const prevBook = books[bookIdx - 1];
      return { book: prevBook.code, n: prevBook.chapterCount };
    }
    return null;
  }, [bookIdx, books, chapter.chapter, currentBook]);

  const next = useMemo(() => {
    if (!currentBook) return null;
    if (chapter.chapter < currentBook.chapterCount) return { book: currentBook.code, n: chapter.chapter + 1 };
    if (bookIdx < books.length - 1) {
      const nextBook = books[bookIdx + 1];
      return { book: nextBook.code, n: 1 };
    }
    return null;
  }, [bookIdx, books, chapter.chapter, currentBook]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }, []);

  // Load stored preferences once after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFontScale(readFontScale());
    setCopyOptions(readCopyOptions());
  }, []);

  // Initial: save last-read, handle hash anchor
  useEffect(() => {
    writeLastRead({
      translationCode: translation.code,
      translationName: translation.name,
      bookCode: chapter.book.code,
      bookName: chapter.book.name,
      chapter: chapter.chapter,
      savedAt: Date.now(),
    });

    // A chapter change is a soft navigation: same component instance, new props,
    // so any previous selection survives unless it is cleared here. Leaving it
    // would highlight verse 16 of the new chapter and copy its text under a
    // selection the reader never made.
    const hash = window.location.hash;
    const m = hash.match(/^#v(\d+)$/);
    const n = m ? parseInt(m[1], 10) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedVerses(n === null ? new Set() : new Set([n]));
    anchorRef.current = n;
    if (n !== null) {
      window.requestAnimationFrame(() => {
        versesRef.current.get(n)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    setMultiScreen(!!(window.screen as Screen & { isExtended?: boolean }).isExtended);
  }, [translation.code, translation.name, chapter.book.code, chapter.book.name, chapter.chapter]);

  async function openPresenter() {
    const projectorUrl = `/${locale}/bible/${translation.code}/${chapter.book.code}/${chapter.chapter}?projector=1`;

    // Reuse the existing display window if it's still alive — just navigate it.
    if (displayWinRef.current && !displayWinRef.current.closed) {
      displayWinRef.current.location.assign(projectorUrl);
      document.body.style.overflow = 'hidden';
      setPresenterOpen(true);
      return;
    }

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
    const win = window.open(projectorUrl, 'bible-projector-display', features);
    displayWinRef.current = win;
    document.body.style.overflow = 'hidden';
    setPresenterOpen(true);
  }

  // openPresenter locks body scroll; a route change unmounts this reader without
  // ever running closePresenter, which would leave the whole site unscrollable.
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  function closePresenter() {
    document.body.style.overflow = '';
    // Do NOT null the ref — keep the window alive so the next openPresenter()
    // call can reuse it without spawning a new window.
    setPresenterOpen(false);
    setCompareCode(null);
    setParallelChapter(null);
  }

  // Fetch parallel chapter data when a comparison translation is picked while
  // the presenter is open. The display window navigates separately via the
  // `passage` channel message + URL `?compare=` param.
  useEffect(() => {
    if (!compareCode || compareCode === translation.code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParallelChapter(null);
      return;
    }
    let cancelled = false;
    fetchParallelChapter(translation.code, compareCode, chapter.book.code, chapter.chapter, apiUrl).then((p) => {
      if (!cancelled) setParallelChapter(p);
    });
    return () => {
      cancelled = true;
    };
  }, [compareCode, translation.code, chapter.book.code, chapter.chapter, apiUrl]);

  function handleCompareChange(secondaryCode: string | null) {
    setCompareCode(secondaryCode);
    // Reload the display window with the new compare param so its projector
    // page re-fetches in parallel mode.
    const win = displayWinRef.current;
    if (!win || win.closed) return;
    const params = new URLSearchParams();
    params.set('projector', '1');
    if (secondaryCode) params.set('compare', secondaryCode);
    win.location.assign(
      `/${locale}/bible/${translation.code}/${chapter.book.code}/${chapter.chapter}?${params.toString()}`
    );
  }

  // Track native browser text selection within verse text spans.
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (!text || !sel) {
        setSelectionInfo(null);
        return;
      }
      // Walk up from the anchor node to find the parent .bible-verse li.
      let node: Node | null = sel.anchorNode;
      let verseEl: HTMLLIElement | null = null;
      while (node) {
        if (node instanceof HTMLElement) {
          if (node.classList.contains('bible-verse')) {
            verseEl = node as HTMLLIElement;
            break;
          }
        }
        node = node.parentNode;
      }
      if (!verseEl) {
        setSelectionInfo(null);
        return;
      }
      const verseNum = parseInt(verseEl.id.replace('v', ''), 10);
      if (!isNaN(verseNum)) setSelectionInfo({ text, verseNum });
      else setSelectionInfo(null);
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  function findVerseInViewport(): number | null {
    const mid = window.innerHeight / 2;
    let bestN: number | null = null;
    let bestDist = Infinity;
    versesRef.current.forEach((el, n) => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestN = n;
        bestDist = dist;
      }
    });
    return bestN;
  }

  function scrollToAdjacentVerse(direction: 1 | -1) {
    if (sortedVerseNumbers.length === 0) return;
    const lastSelected =
      selectedVerses.size > 0 ? Math.max(...selectedVerses) : (findVerseInViewport() ?? sortedVerseNumbers[0]);
    const idx = sortedVerseNumbers.indexOf(lastSelected);
    const targetIdx = Math.max(0, Math.min(sortedVerseNumbers.length - 1, idx + direction));
    const target = sortedVerseNumbers[targetIdx];
    setSelectedVerses(new Set([target]));
    anchorRef.current = target;
    versesRef.current.get(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select') || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // The presenter dashboard is a sibling portal, not a mode switch — this
      // reader stays mounted underneath it. Both listen on window in the bubble
      // phase, so without this guard an arrow key would step the presenter's
      // verse *and* navigate this window to the next chapter, resetting the
      // selection and desyncing the display.
      if (presenterOpen) return;

      if (e.key === 'ArrowLeft' && prev) {
        e.preventDefault();
        router.push(`/${locale}/bible/${translation.code}/${prev.book}/${prev.n}`);
      } else if (e.key === 'ArrowRight' && next) {
        e.preventDefault();
        router.push(`/${locale}/bible/${translation.code}/${next.book}/${next.n}`);
      } else if (e.key === 'j' || e.key === 'k') {
        e.preventDefault();
        scrollToAdjacentVerse(e.key === 'j' ? 1 : -1);
      } else if (e.key === 'g') {
        e.preventDefault();
        setPickerOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // scrollToAdjacentVerse reads the live selection via findVerseInViewport — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, translation.code, prev, next, router, presenterOpen]);

  function handleFontStep(direction: 1 | -1) {
    const idx = FONT_SCALES.indexOf(fontScale);
    const nextIdx = Math.max(0, Math.min(FONT_SCALES.length - 1, idx + direction));
    const nv = FONT_SCALES[nextIdx];
    setFontScale(nv);
    writeFontScale(nv);
  }

  function handleVerseClick(verse: number, e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl-click: toggle this verse in the selection (non-contiguous).
      setSelectedVerses((prev) => {
        const next = new Set(prev);
        if (next.has(verse)) next.delete(verse);
        else next.add(verse);
        return next;
      });
      anchorRef.current = verse;
      return;
    }
    if (e.shiftKey && anchorRef.current !== null) {
      // Shift-click: extend a contiguous range from the anchor.
      const lo = Math.min(anchorRef.current, verse);
      const hi = Math.max(anchorRef.current, verse);
      const range = new Set<number>();
      for (let v = lo; v <= hi; v++) range.add(v);
      setSelectedVerses(range);
      return;
    }
    // Plain click: toggle a single verse.
    setSelectedVerses((prev) => (prev.has(verse) && prev.size === 1 ? new Set() : new Set([verse])));
    anchorRef.current = verse;
  }

  async function handleShare() {
    const firstSelected = selectedVerses.size > 0 ? Math.min(...selectedVerses) : null;
    const url = `${window.location.origin}/${locale}/bible/${translation.code}/${chapter.book.code}/${chapter.chapter}${
      firstSelected ? `#v${firstSelected}` : ''
    }`;
    const title = `${chapter.book.name} ${chapter.chapter}${firstSelected ? `:${firstSelected}` : ''} — ${translation.name}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('linkCopied'));
    } catch {
      // ignore
    }
  }

  async function handleCopyVerses() {
    if (selectedVerses.size === 0) return;
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const verseObjs = sorted
      .map((n) => chapter.verses.find((v) => v.verse === n))
      .filter((v): v is { verse: number; text: string } => v !== undefined);
    const pageUrl = `${window.location.origin}/${locale}/bible/${translation.code}/${chapter.book.code}/${chapter.chapter}`;
    const text = buildCopyText({
      options: copyOptions,
      bookName: chapter.book.name,
      bookAbbr: chapter.book.abbreviation,
      bookCode: chapter.book.code,
      chapter: chapter.chapter,
      translationName: translation.name,
      translationCode: translation.code,
      translationAbbr: translation.abbreviation,
      verses: verseObjs,
      pageUrl,
    });
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('versesCopied', { count: verseObjs.length }));
    } catch {
      // clipboard blocked — ignore silently
    }
  }

  async function handleCopySelection() {
    if (!selectionInfo) return;
    const ref = `${chapter.book.name} ${chapter.chapter}:${selectionInfo.verseNum}`;
    const trName = translation.name;
    const text = `„${selectionInfo.text}“\n— ${ref} (${trName})`;
    try {
      await navigator.clipboard.writeText(text);
      window.getSelection()?.removeAllRanges();
      setSelectionInfo(null);
      showToast(t('selectionCopied'));
    } catch {
      // clipboard blocked — ignore silently
    }
  }

  function updateCopyOption<K extends keyof CopyOptions>(key: K, value: CopyOptions[K]) {
    setCopyOptions((prev) => {
      const next = { ...prev, [key]: value };
      writeCopyOptions(next);
      return next;
    });
  }

  // Live preview of what the clipboard text will look like with current options.
  // Uses the actual selection when present, otherwise the first two verses of
  // the chapter as a sample so the user can see formatting before selecting.
  const copyPreview = useMemo(() => {
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const verseObjs =
      sorted.length > 0
        ? sorted
            .map((n) => chapter.verses.find((v) => v.verse === n))
            .filter((v): v is { verse: number; text: string } => v !== undefined)
        : chapter.verses.slice(0, 2);
    if (verseObjs.length === 0) return '';
    const pageUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/${locale}/bible/${translation.code}/${chapter.book.code}/${chapter.chapter}`
        : `https://treasures.sdarm.life/${locale}/bible/${translation.code}/${chapter.book.code}/${chapter.chapter}`;
    return buildCopyText({
      options: copyOptions,
      bookName: chapter.book.name,
      bookAbbr: chapter.book.abbreviation,
      bookCode: chapter.book.code,
      chapter: chapter.chapter,
      translationName: translation.name,
      translationCode: translation.code,
      translationAbbr: translation.abbreviation,
      verses: verseObjs,
      pageUrl,
    });
  }, [copyOptions, selectedVerses, chapter, translation, locale]);

  function handlePickerTarget(target: PassageTarget) {
    setPickerOpen(false);
    const verseSuffix = target.verse !== undefined ? `#v${target.verse}` : '';
    router.push(`/${locale}/bible/${translation.code}/${target.bookCode}/${target.chapter}${verseSuffix}`);
  }

  return (
    <div className="bible-reader" style={{ fontSize: `${fontScale}rem` }}>
      <nav className="bible-reader-breadcrumb">
        <Link href={`/${locale}/bible`} className="bible-back-link">
          {t('homeLink')}
        </Link>
        <span className="bible-breadcrumb-sep">/</span>
        <Link href={`/${locale}/bible/${translation.code}`} className="bible-back-link">
          {translation.name}
        </Link>
        <span className="bible-breadcrumb-sep">/</span>
        <Link href={`/${locale}/bible/${translation.code}/${chapter.book.code}`} className="bible-back-link">
          {chapter.book.name}
        </Link>
        <span className="bible-breadcrumb-sep">/</span>
        <span className="bible-breadcrumb-current">{t('chapter', { n: chapter.chapter })}</span>
      </nav>

      <div className="bible-reader-navbar" aria-label={t('ariaChapterNav')}>
        <Link
          href={prev ? `/${locale}/bible/${translation.code}/${prev.book}/${prev.n}` : '#'}
          className={`bible-nav-btn${prev ? '' : ' disabled'}`}
          aria-disabled={!prev}
          onClick={(e) => !prev && e.preventDefault()}
          aria-label={t('previousChapter')}
        >
          ←
        </Link>

        <div className="bible-reader-pickers">
          <button
            type="button"
            className="bible-jump-btn"
            onClick={() => setPickerOpen(true)}
            aria-label={t('jumpAria')}
            title={t('jumpHint')}
          >
            <span className="bible-jump-btn__label">
              {chapter.book.name} {chapter.chapter}
            </span>
            <span className="bible-jump-btn__caret" aria-hidden="true">
              ⌄
            </span>
          </button>
        </div>

        <Link
          href={next ? `/${locale}/bible/${translation.code}/${next.book}/${next.n}` : '#'}
          className={`bible-nav-btn${next ? '' : ' disabled'}`}
          aria-disabled={!next}
          onClick={(e) => !next && e.preventDefault()}
          aria-label={t('nextChapter')}
        >
          →
        </Link>
      </div>

      <article className="bible-chapter">
        <ol className="bible-verses" aria-label={t('ariaVerseList')}>
          {chapter.verses.map((v) => (
            <li
              key={v.verse}
              id={`v${v.verse}`}
              ref={(el) => {
                if (el) versesRef.current.set(v.verse, el);
                else versesRef.current.delete(v.verse);
              }}
              className={`bible-verse${selectedVerses.has(v.verse) ? ' highlighted' : ''}`}
            >
              <button
                type="button"
                className="bible-verse-num"
                onClick={(e) => handleVerseClick(v.verse, e)}
                aria-label={t('selectVerseAria', { n: v.verse })}
              >
                {v.verse}
              </button>
              <span className="bible-verse-text" onClick={(e) => handleVerseClick(v.verse, e)}>
                {v.text}
              </span>
            </li>
          ))}
        </ol>
        {chapter.translation.copyright && <p className="bible-copyright">{chapter.translation.copyright}</p>}
      </article>

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
        {selectedVerses.size > 0 && (
          <>
            <button type="button" className="bible-action-btn bible-action-btn--accent" onClick={handleCopyVerses}>
              {t('copyVerses', { count: selectedVerses.size })}
            </button>
            <button
              type="button"
              className="bible-action-btn bible-action-btn--icon"
              onClick={() => setCopyOptionsOpen((v) => !v)}
              aria-expanded={copyOptionsOpen}
              aria-label={t('copyOptionsAria')}
              title={t('copyOptionsAria')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947z M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
                />
              </svg>
            </button>
          </>
        )}
        {selectionInfo && (
          <button type="button" className="bible-action-btn bible-action-btn--accent" onClick={handleCopySelection}>
            {t('copySelection')}
          </button>
        )}
        {selectedVerses.size > 0 && (
          <button type="button" className="bible-action-btn" onClick={handleShare}>
            {t('shareVerse')}
          </button>
        )}
        {translations.find((tr) => tr.code !== translation.code) && (
          <Link
            href={`/${locale}/bible/${translation.code}/${chapter.book.code}/${chapter.chapter}?compare=${
              translations.find((tr) => tr.code !== translation.code)!.code
            }`}
            className="bible-action-btn"
          >
            {t('parallel')}
          </Link>
        )}
        <button
          type="button"
          className="bible-action-btn"
          onClick={openPresenter}
          disabled={presenterOpen}
          title={multiScreen ? undefined : t('presenterSingleScreenHint')}
        >
          {t('presenter')}
        </button>
      </div>

      {copyOptionsOpen && (
        <div
          className="bible-copy-options"
          role="dialog"
          aria-label={t('copyOptionsAria')}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCopyOptionsOpen(false);
          }}
        >
          <div className="bible-copy-options__panel">
            <header className="bible-copy-options__header">
              <h3>{t('copyOptionsTitle')}</h3>
              <button
                type="button"
                className="bible-copy-options__close"
                onClick={() => setCopyOptionsOpen(false)}
                aria-label={t('close')}
              >
                ✕
              </button>
            </header>
            <div className="bible-copy-options__settings">
              <fieldset className="bible-copy-options__fieldset">
                <legend>{t('copyOptionNumbersStyle')}</legend>
                {(['none', 'plain', 'superscript', 'bracket'] as const).map((style) => {
                  const key = `copyVerseNumberStyle_${style}` as const;
                  const full = t(key);
                  return (
                    <label key={style} className="bible-copy-options__radio">
                      <input
                        type="radio"
                        name="copyVerseNumberStyle"
                        checked={copyOptions.verseNumberStyle === style}
                        onChange={() => updateCopyOption('verseNumberStyle', style)}
                      />
                      <span title={full}>{PILL_SYMBOL[key] ?? full}</span>
                    </label>
                  );
                })}
              </fieldset>

              <div className="bible-copy-options__sep" />
              <label className="bible-copy-options__row" title={t('copyOptionReference')}>
                <input
                  type="checkbox"
                  checked={copyOptions.includeReference}
                  onChange={(e) => updateCopyOption('includeReference', e.target.checked)}
                />
                <span>{t('copyOptionReferenceShort')}</span>
              </label>
              <fieldset className="bible-copy-options__fieldset">
                <legend>{t('copyOptionReferencePosition')}</legend>
                {(['top', 'bottom'] as const).map((pos) => {
                  const key = `copyReferencePosition_${pos}` as const;
                  const full = t(key);
                  return (
                    <label key={pos} className="bible-copy-options__radio">
                      <input
                        type="radio"
                        name="copyReferencePosition"
                        checked={copyOptions.referencePosition === pos}
                        onChange={() => updateCopyOption('referencePosition', pos)}
                        disabled={!copyOptions.includeReference}
                      />
                      <span title={full}>{PILL_SYMBOL[key] ?? full}</span>
                    </label>
                  );
                })}
              </fieldset>
              <fieldset className="bible-copy-options__fieldset">
                <legend>{t('copyOptionBookStyle')}</legend>
                {(['full', 'abbr'] as const).map((style) => {
                  const full = t(`copyBookStyle_${style}`);
                  // The pill shows the actual current book — self-descriptive
                  // and already localized to the translation's language.
                  const pill = style === 'full' ? chapter.book.name : chapter.book.abbreviation;
                  return (
                    <label key={style} className="bible-copy-options__radio">
                      <input
                        type="radio"
                        name="copyReferenceBookStyle"
                        checked={copyOptions.referenceBookStyle === style}
                        onChange={() => updateCopyOption('referenceBookStyle', style)}
                        disabled={!copyOptions.includeReference}
                      />
                      <span title={full}>{pill}</span>
                    </label>
                  );
                })}
              </fieldset>

              <label className="bible-copy-options__row" title={t('copyOptionTranslation')}>
                <input
                  type="checkbox"
                  checked={copyOptions.includeTranslation}
                  onChange={(e) => updateCopyOption('includeTranslation', e.target.checked)}
                  disabled={!copyOptions.includeReference}
                />
                <span>{t('copyOptionTranslationShort')}</span>
              </label>
              <fieldset className="bible-copy-options__fieldset">
                <legend>{t('copyOptionTranslationStyle')}</legend>
                {(['full', 'short'] as const).map((style) => {
                  const full = t(`copyTranslationStyle_${style}`);
                  const pill =
                    style === 'full'
                      ? translation.name
                      : shortTranslationName(translation.abbreviation, translation.code);
                  return (
                    <label key={style} className="bible-copy-options__radio">
                      <input
                        type="radio"
                        name="copyTranslationStyle"
                        checked={copyOptions.translationNameStyle === style}
                        onChange={() => updateCopyOption('translationNameStyle', style)}
                        disabled={!copyOptions.includeReference || !copyOptions.includeTranslation}
                      />
                      <span title={full}>{pill}</span>
                    </label>
                  );
                })}
              </fieldset>

              <div className="bible-copy-options__sep" />
              <fieldset className="bible-copy-options__fieldset">
                <legend>{t('copyOptionQuoteStyle')}</legend>
                {(['none', 'curly', 'german', 'guillemets'] as const).map((style) => {
                  const key = `copyQuoteStyle_${style}` as const;
                  const full = t(key);
                  return (
                    <label key={style} className="bible-copy-options__radio">
                      <input
                        type="radio"
                        name="copyQuoteStyle"
                        checked={copyOptions.quoteStyle === style}
                        onChange={() => updateCopyOption('quoteStyle', style)}
                      />
                      <span title={full}>{PILL_SYMBOL[key] ?? full}</span>
                    </label>
                  );
                })}
              </fieldset>

              <fieldset className="bible-copy-options__fieldset">
                <legend>{t('copyOptionLink')}</legend>
                {(['none', 'short', 'full'] as LinkStyle[]).map((style) => {
                  const key = `copyLinkStyle_${style}` as const;
                  const full = t(key);
                  const pill = style === 'none' ? '—' : style === 'short' ? t('pillShort') : t('pillFull');
                  return (
                    <label key={style} className="bible-copy-options__radio">
                      <input
                        type="radio"
                        name="copyLinkStyle"
                        checked={copyOptions.linkStyle === style}
                        onChange={() => updateCopyOption('linkStyle', style)}
                      />
                      <span title={full}>{pill}</span>
                    </label>
                  );
                })}
              </fieldset>

              <fieldset className="bible-copy-options__fieldset">
                <legend>{t('copyOptionSeparator')}</legend>
                {(['newline', 'space'] as const).map((sep) => {
                  const key = `copySeparator_${sep}` as const;
                  const full = t(key);
                  return (
                    <label key={sep} className="bible-copy-options__radio">
                      <input
                        type="radio"
                        name="copySeparator"
                        checked={copyOptions.separator === sep}
                        onChange={() => updateCopyOption('separator', sep)}
                      />
                      <span title={full}>{PILL_SYMBOL[key] ?? full}</span>
                    </label>
                  );
                })}
              </fieldset>

              <div className="bible-copy-options__sep" />
              <label className="bible-copy-options__row" title={t('copyOptionMarkdown')}>
                <input
                  type="checkbox"
                  checked={copyOptions.markdown}
                  onChange={(e) => updateCopyOption('markdown', e.target.checked)}
                />
                <span>Markdown</span>
              </label>
            </div>
            <div className="bible-copy-options__preview-pane">
              <div className="bible-copy-options__preview">
                <div className="bible-copy-options__preview-label">
                  {selectedVerses.size === 0 ? t('copyPreviewSample') : t('copyPreview')}
                </div>
                <pre className="bible-copy-options__preview-text">{copyPreview}</pre>
                <div className="bible-copy-options__preview-actions">
                  <button
                    type="button"
                    className="bible-action-btn bible-action-btn--accent"
                    onClick={async () => {
                      if (!copyPreview) return;
                      try {
                        await navigator.clipboard.writeText(copyPreview);
                        showToast(t('versesCopied', { count: Math.max(selectedVerses.size, 1) }));
                        setCopyOptionsOpen(false);
                      } catch {
                        // ignore
                      }
                    }}
                    disabled={!copyPreview}
                  >
                    {selectedVerses.size === 0
                      ? t('copyPreviewSampleCta')
                      : t('copyVerses', { count: selectedVerses.size })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {presenterOpen && (
        <BiblePresenterDashboard
          chapter={chapter}
          books={books}
          locale={locale}
          translations={translations}
          parallel={parallelChapter}
          compareCode={compareCode}
          onClose={closePresenter}
          onPickPassage={handlePickerTarget}
          onCompareChange={handleCompareChange}
          onTranslationChange={(code) =>
            router.push(`/${locale}/bible/${code}/${chapter.book.code}/${chapter.chapter}`)
          }
        />
      )}

      {pickerOpen && (
        <div
          className="bible-picker-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={t('jumpAria')}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
        >
          <div className="bible-picker-sheet__panel">
            <BiblePassagePicker books={books} onPick={handlePickerTarget} autoFocus />
            <button
              type="button"
              className="bible-picker-sheet__close"
              onClick={() => setPickerOpen(false)}
              aria-label={t('close')}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="bible-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
