'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { BibleBook, BibleChapter, BibleTranslation, ParallelChapter } from '../../lib/bible';
import { DEFAULT_FONT_SCALE, FONT_SCALES, type FontScale } from './lastRead';
import BiblePassagePicker, { type PassageTarget } from './BiblePassagePicker';

interface Props {
  chapter: BibleChapter;
  books: BibleBook[];
  locale: string;
  /** All available translations — used by both the primary and compare dropdowns. */
  translations: BibleTranslation[];
  /** Parallel chapter data — present when in parallel mode. */
  parallel?: ParallelChapter | null;
  /** Currently-selected secondary translation code (or null for single mode). */
  compareCode: string | null;
  onClose: () => void;
  onPickPassage: (target: PassageTarget) => void;
  /** Switch into / out of parallel mode. Pass null for single. */
  onCompareChange: (secondaryCode: string | null) => void;
  /** Switch the PRIMARY translation (navigates to same book/chapter in new translation). */
  onTranslationChange: (code: string) => void;
}

type Selection = ReadonlySet<number>;

const CHANNEL = 'bible-projector';

function makeRange(a: number, b: number): Selection {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const out = new Set<number>();
  for (let v = lo; v <= hi; v++) out.add(v);
  return out;
}

function summarize(selection: Selection): { lo: number; hi: number; counter: string } {
  const arr = [...selection].sort((a, b) => a - b);
  const lo = arr[0] ?? 1;
  const hi = arr[arr.length - 1] ?? 1;
  const isContiguous = arr.length === hi - lo + 1;
  const counter = arr.length === 1 ? `${lo}` : isContiguous ? `${lo}–${hi}` : arr.join(', ');
  return { lo, hi, counter };
}

export default function BiblePresenterDashboard({
  chapter,
  books,
  locale,
  translations,
  parallel,
  compareCode,
  onClose,
  onPickPassage,
  onCompareChange,
  onTranslationChange,
}: Props) {
  const t = useTranslations('treasures.bible');
  const isParallel = !!parallel;
  // In parallel mode the verse list comes from the merged parallel verses
  // (so the strip + preview see the union of A and B verse numbers).
  const verses = isParallel
    ? parallel!.verses.map((v) => ({ verse: v.verse, text: v.a ?? v.b ?? '' }))
    : chapter.verses;
  const firstVerse = verses[0]?.verse ?? 1;
  const lastVerse = verses[verses.length - 1]?.verse ?? 1;

  const [selection, setSelection] = useState<Selection>(() => new Set([firstVerse]));
  const anchorRef = useRef<number>(firstVerse);
  const [fontScale, setFontScale] = useState<FontScale>(DEFAULT_FONT_SCALE);
  const [blank, setBlank] = useState(false);
  const [mounted] = useState(() => typeof window !== 'undefined');
  const [connected, setConnected] = useState(false);

  // Reset on passage change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection(new Set([firstVerse]));
    anchorRef.current = firstVerse;
    setBlank(false);
  }, [chapter.book.code, chapter.chapter, firstVerse]);

  const setSingle = useCallback((n: number) => {
    setSelection(new Set([n]));
    anchorRef.current = n;
  }, []);

  const extendTo = useCallback((n: number) => {
    setSelection(makeRange(anchorRef.current, n));
  }, []);

  // Cmd/Ctrl-click: toggle this verse in the current selection (non-contiguous).
  // If toggling would empty the set, fall back to a single-verse selection on n.
  const toggleVerse = useCallback((n: number) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next.size === 0 ? new Set([n]) : next;
    });
    anchorRef.current = n;
  }, []);

  const stepSingle = useCallback(
    (direction: 1 | -1) => {
      setSelection((prev) => {
        const arr = [...prev].sort((a, b) => a - b);
        const center = direction > 0 ? arr[arr.length - 1] : arr[0];
        const next = Math.max(firstVerse, Math.min(lastVerse, center + direction));
        anchorRef.current = next;
        return new Set([next]);
      });
    },
    [firstVerse, lastVerse]
  );

  const extendRange = useCallback(
    (direction: 1 | -1) => {
      setSelection((prev) => {
        const arr = [...prev].sort((a, b) => a - b);
        if (direction > 0) {
          const last = arr[arr.length - 1];
          const next = Math.min(lastVerse, last + 1);
          const out = new Set(prev);
          out.add(next);
          return out;
        }
        const first = arr[0];
        const prevV = Math.max(firstVerse, first - 1);
        const out = new Set(prev);
        out.add(prevV);
        return out;
      });
    },
    [firstVerse, lastVerse]
  );

  // Refs so the channel handler always reads the latest state for re-sync.
  const selectionRef = useRef(selection);
  const fontScaleRef = useRef(fontScale);
  const blankRef = useRef(blank);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  useEffect(() => {
    fontScaleRef.current = fontScale;
  }, [fontScale]);
  useEffect(() => {
    blankRef.current = blank;
  }, [blank]);

  // BroadcastChannel — bidirectional sync with the display window.
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isSelectionRemote = useRef(false);
  const isFontRemote = useRef(false);
  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e) => {
      if (e.data.type === 'ready') {
        setConnected(true);
        // Push current state so the freshly-loaded display syncs up.
        ch.postMessage({ type: 'selection', verses: [...selectionRef.current].sort((a, b) => a - b) });
        ch.postMessage({ type: 'fontScale', value: fontScaleRef.current });
        ch.postMessage({ type: 'blank', on: blankRef.current });
      } else if (e.data.type === 'selection') {
        isSelectionRemote.current = true;
        setSelection(new Set<number>(e.data.verses));
      } else if (e.data.type === 'fontScale') {
        isFontRemote.current = true;
        setFontScale(e.data.value);
      }
    };
    channelRef.current = ch;
    return () => ch.close();
  }, []);

  useEffect(() => {
    if (isSelectionRemote.current) {
      isSelectionRemote.current = false;
      return;
    }
    channelRef.current?.postMessage({ type: 'selection', verses: [...selection].sort((a, b) => a - b) });
  }, [selection]);

  useEffect(() => {
    if (isFontRemote.current) {
      isFontRemote.current = false;
      return;
    }
    channelRef.current?.postMessage({ type: 'fontScale', value: fontScale });
  }, [fontScale]);

  // Blank toggle is presenter → display only (no bidirectional sync needed).
  useEffect(() => {
    channelRef.current?.postMessage({ type: 'blank', on: blank });
  }, [blank]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select') || target.isContentEditable) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        if (e.shiftKey) extendRange(1);
        else stepSingle(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.shiftKey) extendRange(-1);
        else stepSingle(-1);
      } else if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setBlank((v) => !v);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepSingle, extendRange, onClose]);

  // Auto-scroll active verse into view in the right preview list whenever the
  // selection changes via keyboard nav or channel sync. Strip click navigation
  // suppresses the auto-scroll (user already sees what they clicked).
  const stripRowsRef = useRef<Map<number, HTMLLIElement>>(new Map());
  const mirrorVerseRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const mirrorFrameRef = useRef<HTMLElement>(null);
  const [mirrorScale, setMirrorScale] = useState(1);
  const suppressScrollRef = useRef(false);

  // Scale the 1280×720 stage so it fills the mirror container exactly.
  // Depends on `mounted` so it runs after the portal is in the DOM.
  useEffect(() => {
    if (!mounted) return;
    const frame = mirrorFrameRef.current;
    if (!frame) return;
    const update = () => setMirrorScale(frame.offsetWidth / 1280);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [mounted]);

  // Scroll the mirror to keep the active verse near the top, same as the projector.
  useEffect(() => {
    if (selection.size === 0) return;
    const min = Math.min(...selection);
    const el = mirrorVerseRefs.current.get(min);
    if (!el) return;
    const list = el.closest('.bible-presenter__mirror-verses') as HTMLElement | null;
    if (!list) return;
    const target = Math.max(0, el.offsetTop - Math.round(720 * 0.18));
    list.scrollTo({ top: target, behavior: 'smooth' });
  }, [selection]);

  function handlePick(target: PassageTarget) {
    // Navigate both windows: the operator window (via parent) and the display
    // window (via channel). The display reloads at the new URL and rejoins
    // the channel via its `ready` handshake.
    channelRef.current?.postMessage({
      type: 'passage',
      locale,
      translationCode: chapter.translation.code,
      bookCode: target.bookCode,
      chapter: target.chapter,
      compare: compareCode ?? null,
    });
    setConnected(false); // until the display sends `ready` again
    onPickPassage(target);
  }

  function handleCompareSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const next = value === '' ? null : value;
    onCompareChange(next);
  }

  function handlePrimaryTranslationChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newCode = e.target.value;
    if (newCode === chapter.translation.code) return;
    channelRef.current?.postMessage({
      type: 'passage',
      locale,
      translationCode: newCode,
      bookCode: chapter.book.code,
      chapter: chapter.chapter,
      compare: compareCode ?? null,
    });
    setConnected(false);
    onTranslationChange(newCode);
  }

  if (!mounted) return null;

  const { counter } = summarize(selection);
  const sortedSelected = [...selection].sort((a, b) => a - b);
  const minSelected = sortedSelected[0] ?? firstVerse;
  const maxSelected = sortedSelected[sortedSelected.length - 1] ?? firstVerse;

  return createPortal(
    <div className="bible-presenter">
      <div className="bible-presenter__header">
        <span className="bible-presenter__brand nav-logo">
          SDARM<span>.life</span>
        </span>
        <div className="bible-presenter__chapter-info">
          <span className="bible-presenter__chapter-num">{chapter.book.name}</span> {chapter.chapter}
        </div>
        <select
          className="bible-presenter__translation-select"
          value={chapter.translation.code}
          onChange={handlePrimaryTranslationChange}
          aria-label="Primary translation"
        >
          {translations.map((tr) => (
            <option key={tr.code} value={tr.code}>
              {tr.name}
            </option>
          ))}
        </select>
        <div className="bible-presenter__header-right">
          <select
            className={`bible-presenter__compare${compareCode ? ' bible-presenter__compare--active' : ''}`}
            value={compareCode ?? ''}
            onChange={handleCompareSelect}
            aria-label={t('compareWith')}
            title={t('compareWith')}
          >
            <option value="">{t('compareOff')}</option>
            {translations
              .filter((tr) => tr.code !== chapter.translation.code)
              .map((tr) => (
                <option key={tr.code} value={tr.code}>
                  {tr.name}
                </option>
              ))}
          </select>
          <div className="bible-presenter__header-divider" />
          <button
            className={`bible-presenter__ctrl-btn bible-presenter__ctrl-btn--icon${blank ? ' is-active' : ''}`}
            onClick={() => setBlank((v) => !v)}
            disabled={!connected}
            aria-pressed={blank}
            aria-label={blank ? t('unblankScreen') : t('blankScreen')}
            title={blank ? t('unblankScreen') : t('blankScreen')}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15">
              <rect x="2" y="2.5" width="16" height="11" rx="1.5" />
              <path d="M6 17h8M10 13.5V17" strokeLinecap="round" />
              {blank && <line x1="5" y1="6" x2="15" y2="10" strokeLinecap="round" />}
            </svg>
          </button>
          <button
            className="bible-presenter__ctrl-btn bible-presenter__ctrl-btn--icon"
            onClick={() => channelRef.current?.postMessage({ type: 'requestFullscreen' })}
            disabled={!connected}
            aria-label={t('fullscreenAria')}
            title={t('fullscreenAria')}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="bible-presenter__header-divider" />
          <button
            className="bible-presenter__ctrl-btn"
            onClick={() => setFontScale((s) => FONT_SCALES[Math.max(0, FONT_SCALES.indexOf(s) - 1)])}
            disabled={fontScale === FONT_SCALES[0]}
            title={t('decreaseFont')}
          >
            A−
          </button>
          <span className="bible-presenter__font-scale">{Math.round(fontScale * 100)}%</span>
          <button
            className="bible-presenter__ctrl-btn"
            onClick={() =>
              setFontScale((s) => FONT_SCALES[Math.min(FONT_SCALES.length - 1, FONT_SCALES.indexOf(s) + 1)])
            }
            disabled={fontScale === FONT_SCALES[FONT_SCALES.length - 1]}
            title={t('increaseFont')}
          >
            A+
          </button>
          <button className="bible-presenter__close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>
      </div>

      <div className="bible-presenter__body">
        <aside className="bible-presenter__strip" aria-label={t('ariaVerseList')}>
          <div className="bible-presenter__picker">
            <BiblePassagePicker books={books} onPick={handlePick} />
          </div>
          <ol className="bible-presenter__strip-list">
            {verses.map((v) => {
              const isSelected = selection.has(v.verse);
              return (
                <li
                  key={v.verse}
                  ref={(el) => {
                    if (el) stripRowsRef.current.set(v.verse, el);
                    else stripRowsRef.current.delete(v.verse);
                  }}
                >
                  <button
                    type="button"
                    className={`bible-presenter__strip-row${isSelected ? ' is-active' : ''}`}
                    onClick={(e) => {
                      suppressScrollRef.current = true;
                      if (e.metaKey || e.ctrlKey) toggleVerse(v.verse);
                      else if (e.shiftKey) extendTo(v.verse);
                      else setSingle(v.verse);
                    }}
                    title={t('rangeShiftClickHint')}
                  >
                    <span className="bible-presenter__strip-num">{v.verse}</span>
                    <span className="bible-presenter__strip-text">{v.text}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="bible-presenter__mirror-panel">
          <main className="bible-presenter__mirror" aria-label={t('currentSlide')} ref={mirrorFrameRef}>
            <div
              className="bible-presenter__mirror-stage"
              style={{ transform: `scale(${mirrorScale})`, fontSize: `${fontScale}em` }}
            >
              {/* Topbar — matches the real projector exactly */}
              <div className="bible-projector__topbar">
                <div className="nav-logo bible-projector__brand">
                  SDARM<span>.life</span>
                </div>
                <div className="bible-projector__header">
                  {chapter.book.name} {chapter.chapter} · {chapter.translation.name}
                </div>
              </div>

              {/* All verses — active highlighted, rest dimmed */}
              <ol className="bible-presenter__mirror-verses">
                {verses.map((v) => {
                  const isActive = selection.has(v.verse);
                  return (
                    <li
                      key={v.verse}
                      ref={(el) => {
                        if (el) mirrorVerseRefs.current.set(v.verse, el);
                        else mirrorVerseRefs.current.delete(v.verse);
                      }}
                      className={`bible-projector__verse${isActive ? ' is-active' : ''}`}
                    >
                      <span className="bible-projector__verse-num">{v.verse}</span>
                      <span className="bible-projector__verse-text">{v.text}</span>
                    </li>
                  );
                })}
              </ol>

              {blank && <div className="bible-presenter__mirror-blank" />}
            </div>
          </main>

          <div className="bible-presenter__footer">
            <button
              className="bible-presenter__nav-btn"
              onClick={() => stepSingle(-1)}
              disabled={minSelected <= firstVerse}
              aria-label={t('previousChapter')}
            >
              ‹
            </button>
            <span className="bible-presenter__counter">
              <strong className="bible-presenter__counter-value">v.{counter}</strong>
              <span className="bible-presenter__counter-total"> / {lastVerse}</span>
            </span>
            <button
              className="bible-presenter__nav-btn"
              onClick={() => stepSingle(1)}
              disabled={maxSelected >= lastVerse}
              aria-label={t('nextChapter')}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {!connected && (
        <div className="bible-presenter__connecting" aria-live="polite">
          <div className="bible-presenter__connecting-inner">
            <div className="bible-presenter__connecting-dots">
              <span />
              <span />
              <span />
            </div>
            <p className="bible-presenter__connecting-text">{t('connecting')}</p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
