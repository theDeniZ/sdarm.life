'use client';

import { Wordmark } from '@sdarm/ui';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { remapPsalmChapter } from '@sdarm/types';
import { fetchBooks, fetchChapter, fetchParallelChapter, type BibleBook, type BibleTranslation } from '../../lib/bible';
import {
  DEFAULT_PROJECTOR_THEME,
  DEFAULT_SLIDE_OPTIONS,
  languageName,
  MAX_PROJECTOR_TRANSLATIONS,
  MAX_SLIDE_VERSES,
  normalizeTheme,
  passageFromChapter,
  passageFromParallel,
  PROJECTOR_CHANNEL,
  PROJECTOR_LAYOUTS,
  PROJECTOR_SCALES,
  PROJECTOR_THEMES,
  projectorLabel,
  recommendedLayout,
  slideFromPassage,
  slideReference,
  verseRange,
  withinRangeCap,
  type HallState,
  type Passage,
  type ProjectorLayout,
  type ProjectorMessage,
  type ProjectorScale,
  type ProjectorTheme,
  type Slide,
  type SlideOptions,
} from '../../lib/projector';
import BiblePassagePicker, { type PassageTarget } from './BiblePassagePicker';
import ProjectorSlide, { ProjectorFrame, useIsClient, type SlideFit } from './ProjectorSlide';

interface Props {
  locale: string;
  /** API base for client-side fetches — the server-only API_URL is not inlined in the browser. */
  apiUrl: string;
  /** Every enabled translation; the operator picks up to four of them. */
  translations: BibleTranslation[];
  /** The translations to start with, primary first. */
  initialCodes: string[];
  bookCode: string;
  chapter: number;
  /** Books of the initial primary translation (already loaded by the reader). */
  initialBooks: BibleBook[];
  onOpenDisplay: (codes: string[], bookCode: string, chapter: number) => void;
  onClose: () => void;
}

const SETTINGS_KEY = 'bible_presenter_settings';
/** Set once the operator has dismissed the key legend that opens on the first run. */
const KEYS_SEEN_KEY = 'bible_presenter_keys_seen';

interface StoredSettings {
  /** May hold a theme id from before the current palettes — read through `normalizeTheme`. */
  theme: ProjectorTheme | string;
  options: SlideOptions;
  directShow: boolean;
  scale: ProjectorScale;
}

/** Per-operator conveniences only — nothing here has to survive or be shared. */
function readSettings(): Partial<StoredSettings> {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredSettings>) : {};
  } catch {
    return {};
  }
}

function writeSettings(s: StoredSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage blocked — the settings simply do not persist.
  }
}

const LAYOUT_KEYS: Record<ProjectorLayout, string> = { rows: '1', columns: '2', grid: '3', focus: '4' };

/**
 * The operator console for the projector (issue #14): up to four translations
 * in the operator's order, a verse browser with Vorschau and Live, the four
 * slide layouts, freeze and black-out, and a 1:1 mirror of the display.
 *
 * Verse text reaches this console only through `use=projector` fetches, so a
 * translation whose license keeps it off a shared screen is refused by the
 * API, not merely hidden here.
 */
export default function BiblePresenterDashboard({
  locale,
  apiUrl,
  translations,
  initialCodes,
  bookCode: initialBookCode,
  chapter: initialChapter,
  initialBooks,
  onOpenDisplay,
  onClose,
}: Props) {
  const t = useTranslations('treasures.bible');
  const mounted = useIsClient();

  // ── What is loaded ──────────────────────────────────────────────────────────
  const [codes, setCodes] = useState<string[]>(() => initialCodes.slice(0, MAX_PROJECTOR_TRANSLATIONS));
  const [place, setPlace] = useState<{ bookCode: string; chapter: number; verse?: number }>({
    bookCode: initialBookCode,
    chapter: initialChapter,
  });
  const [books, setBooks] = useState<BibleBook[]>(initialBooks);
  const booksFor = useRef(initialCodes[0]);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // ── Selection and what the room sees ────────────────────────────────────────
  const [preview, setPreview] = useState<number[]>([]);
  const anchorRef = useRef<number | null>(null);
  /** Mirror of the anchor for rendering (the ref is for handlers). */
  const [anchor, setAnchor] = useState<number | null>(null);
  const setAnchorTo = useCallback((n: number) => {
    anchorRef.current = n;
    setAnchor(n);
  }, []);
  /** The last range extension stopped at MAX_SLIDE_VERSES — say so under the list. */
  const [rangeCapped, setRangeCapped] = useState(false);
  /** Shift held: verses a range could not reach any more look unavailable. */
  const [extending, setExtending] = useState(false);
  const [live, setLive] = useState<Slide | null>(null);
  const [blank, setBlank] = useState(false);
  const [frozen, setFrozen] = useState<HallState | null>(null);
  /** Screen of the live slide when it is split across several. */
  const [part, setPart] = useState(0);
  /**
   * The Vorschau holds the verse cued automatically after `Anzeigen`, not
   * one the operator picked — only then does Enter first finish a split slide.
   */
  const autoCuedRef = useRef(false);

  // ── Presentation settings ───────────────────────────────────────────────────
  const [layoutChoice, setLayoutChoice] = useState<ProjectorLayout | null>(null);
  const [theme, setTheme] = useState<ProjectorTheme>(DEFAULT_PROJECTOR_THEME);
  const [scale, setScale] = useState<ProjectorScale>(1);
  const [options, setOptions] = useState<SlideOptions>(DEFAULT_SLIDE_OPTIONS);
  const [directShow, setDirectShow] = useState(false);
  const [listIndex, setListIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPanelRef = useRef<HTMLElement>(null);

  const [display, setDisplay] = useState<{ width: number; height: number } | null>(null);
  const [liveFit, setLiveFit] = useState<SlideFit | null>(null);
  const [previewFit, setPreviewFit] = useState<SlideFit | null>(null);

  const byCode = useMemo(() => new Map(translations.map((tr) => [tr.code, tr])), [translations]);
  const label = (code: string) => {
    const tr = byCode.get(code);
    return tr ? projectorLabel(tr) : code;
  };
  const count = codes.length;
  const layout: ProjectorLayout = count === 1 ? 'rows' : (layoutChoice ?? recommendedLayout(count));

  // Stored settings are read after mount so the first render matches the server.
  const [settingsRead, setSettingsRead] = useState(false);
  useEffect(() => {
    const s = readSettings();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (s.theme !== undefined) setTheme(normalizeTheme(s.theme));
    if (s.options) setOptions({ ...DEFAULT_SLIDE_OPTIONS, ...s.options });
    if (typeof s.directShow === 'boolean') setDirectShow(s.directShow);
    if (s.scale && PROJECTOR_SCALES.includes(s.scale)) setScale(s.scale);
    setSettingsRead(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  // The key legend opens by itself once, on an operator's first run.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!window.localStorage.getItem(KEYS_SEEN_KEY)) setKeysOpen(true);
    } catch {
      // Storage blocked — the legend stays behind its button.
    }
  }, []);
  function closeKeys() {
    setKeysOpen(false);
    try {
      window.localStorage.setItem(KEYS_SEEN_KEY, '1');
    } catch {
      // Storage blocked — it may open again next time.
    }
  }

  // Settings slide-over: focus moves in when it opens and back to its button when it closes.
  const settingsWasOpen = useRef(false);
  useEffect(() => {
    if (settingsOpen) settingsPanelRef.current?.querySelector<HTMLElement>('button')?.focus();
    else if (settingsWasOpen.current) settingsButtonRef.current?.focus();
    settingsWasOpen.current = settingsOpen;
  }, [settingsOpen]);

  // Nothing is written before the stored values are in state: writing the
  // defaults on the mount pass would overwrite them (twice-run effects in
  // development read back those defaults, and an old theme was lost).
  useEffect(() => {
    if (settingsRead) writeSettings({ theme, options, directShow, scale });
  }, [settingsRead, theme, options, directShow, scale]);

  // Books follow the primary translation — the passage search speaks its language.
  useEffect(() => {
    if (booksFor.current === codes[0]) return;
    let cancelled = false;
    fetchBooks(codes[0], {}, apiUrl).then((list) => {
      if (cancelled || list.length === 0) return;
      booksFor.current = codes[0];
      setBooks(list);
    });
    return () => {
      cancelled = true;
    };
  }, [codes, apiUrl]);

  // The passage in every chosen translation, through the projector gate.
  const codesKey = codes.join(',');
  useEffect(() => {
    let cancelled = false;
    const list = codesKey.split(',');
    const load =
      list.length === 1
        ? fetchChapter(list[0], place.bookCode, place.chapter, { projector: true, apiBase: apiUrl }).then((ch) => {
            const tr = byCode.get(list[0]);
            return ch && tr ? passageFromChapter(ch, tr) : null;
          })
        : fetchParallelChapter(list, place.bookCode, place.chapter, { projector: true, apiBase: apiUrl }).then((p) =>
            p ? passageFromParallel(p) : null
          );
    load.then((p) => {
      if (cancelled) return;
      setLoadFailed(!p);
      if (!p) return;
      setPassage(p);
      const first = p.verses[0]?.verse ?? 1;
      // Same chapter in other translations: keep the operator's place.
      const same = !!passage && passage.bookCode === p.bookCode && passage.chapter === p.chapter;
      const start = place.verse && p.verses.some((v) => v.verse === place.verse) ? place.verse : first;
      if (!same) setAnchorTo(start);
      setPreview((prev) => (same && prev.length > 0 ? prev : [start]));
    });
    return () => {
      cancelled = true;
    };
    // `passage` is read only to compare against the incoming one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codesKey, place, apiUrl, byCode, setAnchorTo]);

  // A translation change re-renders what is live, in the new set of languages.
  useEffect(() => {
    if (!passage) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive((cur) => {
      if (!cur || cur.bookCode !== passage.bookCode || cur.chapter !== passage.chapter) return cur;
      return slideFromPassage(
        passage,
        cur.rows.map((r) => r.verse)
      );
    });
  }, [passage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListIndex((i) => Math.min(i, count - 1));
  }, [count]);

  const previewSlide = useMemo(() => (passage ? slideFromPassage(passage, preview) : null), [passage, preview]);

  // ── The hall state and the channel ──────────────────────────────────────────
  const current: HallState = useMemo(
    () => ({ slide: live, layout, theme, scale, options, blank, frozen: false, part }),
    [live, layout, theme, scale, options, blank, part]
  );
  // Freezing holds everything but black-out: B still has to work instantly.
  const hall: HallState = useMemo(
    () => (frozen ? { ...frozen, blank, frozen: true } : current),
    [frozen, blank, current]
  );

  const channelRef = useRef<BroadcastChannel | null>(null);
  const hallRef = useRef(hall);
  useEffect(() => {
    hallRef.current = hall;
    channelRef.current?.postMessage({ type: 'sync', state: hall } satisfies ProjectorMessage);
  }, [hall]);

  useEffect(() => {
    const ch = new BroadcastChannel(PROJECTOR_CHANNEL);
    ch.onmessage = (e: MessageEvent<ProjectorMessage>) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        setDisplay({ width: msg.width, height: msg.height });
        ch.postMessage({ type: 'sync', state: hallRef.current } satisfies ProjectorMessage);
      } else if (msg.type === 'bye') {
        setDisplay(null);
      }
    };
    channelRef.current = ch;
    ch.postMessage({ type: 'hello' } satisfies ProjectorMessage);
    return () => {
      // The display outlives this console. Leaving it black or frozen would
      // strand the room on a screen nobody can clear any more.
      const s = hallRef.current;
      if (s.blank || s.frozen) ch.postMessage({ type: 'sync', state: { ...s, blank: false, frozen: false } });
      ch.close();
      channelRef.current = null;
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const verseNumbers = useMemo(() => passage?.verses.map((v) => v.verse) ?? [], [passage]);

  const showVerses = useCallback(
    (verses: number[]) => {
      if (!passage) return;
      const slide = slideFromPassage(passage, verses);
      if (!slide) return;
      setFrozen(null);
      setBlank(false);
      setLive(slide);
      setPart(0);
      // Cue the next verse, so reading through a chapter is Enter, Enter, Enter.
      const last = Math.max(...verses);
      const next = verseNumbers.find((v) => v > last);
      autoCuedRef.current = true;
      if (next !== undefined) {
        setPreview([next]);
        setAnchorTo(next);
      } else {
        setPreview(verses);
      }
    },
    [passage, verseNumbers, setAnchorTo]
  );

  const pickVerse = useCallback(
    (n: number, mode: 'single' | 'extend' | 'toggle') => {
      let next: number[];
      let capped = false;
      if (mode === 'extend' && anchorRef.current !== null) {
        ({ verses: next, capped } = verseRange(verseNumbers, anchorRef.current, n));
      } else if (mode === 'toggle') {
        capped = !preview.includes(n) && preview.length >= MAX_SLIDE_VERSES;
        next = preview.includes(n) ? preview.filter((v) => v !== n) : capped ? preview : [...preview, n];
        if (next.length === 0) next = [n];
        if (!capped) setAnchorTo(n);
      } else {
        next = [n];
        setAnchorTo(n);
      }
      setRangeCapped(capped);
      autoCuedRef.current = false;
      next = [...next].sort((a, b) => a - b);
      if (directShow) showVerses(next);
      else setPreview(next);
    },
    [preview, verseNumbers, directShow, showVerses, setAnchorTo]
  );

  const step = useCallback(
    (dir: 1 | -1, extend = false) => {
      if (verseNumbers.length === 0) return;
      autoCuedRef.current = false;
      const sorted = [...preview].sort((a, b) => a - b);
      const edge = dir > 0 ? (sorted[sorted.length - 1] ?? verseNumbers[0]) : (sorted[0] ?? verseNumbers[0]);
      const idx = verseNumbers.indexOf(edge);
      const target = verseNumbers[Math.max(0, Math.min(verseNumbers.length - 1, idx + dir))];
      if (extend) {
        const next = [...new Set([...sorted, target])].sort((a, b) => a - b);
        const capped = next.length > MAX_SLIDE_VERSES;
        setRangeCapped(capped);
        if (capped) return;
        if (directShow) showVerses(next);
        else setPreview(next);
        return;
      }
      setRangeCapped(false);
      setAnchorTo(target);
      if (directShow) showVerses([target]);
      else setPreview([target]);
    },
    [preview, verseNumbers, directShow, showVerses, setAnchorTo]
  );

  // A slide too long for one screen is split (ProjectorSlide reports how many
  // screens); next/previous walk through its screens before anything else.
  const liveParts = liveFit?.parts ?? 1;
  const turnPart = useCallback(
    (dir: 1 | -1): boolean => {
      if (frozen || !live) return false;
      if (dir > 0 && part < liveParts - 1) {
        setPart(part + 1);
        return true;
      }
      if (dir < 0 && part > 0) {
        setPart(Math.min(part, liveParts) - 1);
        return true;
      }
      return false;
    },
    [frozen, live, part, liveParts]
  );

  const toggleFreeze = useCallback(() => {
    setFrozen((f) => (f ? null : { ...current, frozen: true }));
  }, [current]);

  function goToPlace(target: { bookCode: string; chapter: number; verse?: number }) {
    setPlace(target);
    setPreview([]);
  }

  const bookIdx = books.findIndex((b) => b.code === place.bookCode);
  const currentBook = bookIdx >= 0 ? books[bookIdx] : null;
  const prevChapter = currentBook
    ? place.chapter > 1
      ? { bookCode: currentBook.code, chapter: place.chapter - 1 }
      : bookIdx > 0
        ? { bookCode: books[bookIdx - 1].code, chapter: books[bookIdx - 1].chapterCount }
        : null
    : null;
  const nextChapter = currentBook
    ? place.chapter < currentBook.chapterCount
      ? { bookCode: currentBook.code, chapter: place.chapter + 1 }
      : bookIdx < books.length - 1
        ? { bookCode: books[bookIdx + 1].code, chapter: 1 }
        : null
    : null;

  function setCodesWithPlace(next: string[]) {
    // A new primary may number the Psalms differently — keep the same psalm.
    const oldPrimary = byCode.get(codes[0]);
    const newPrimary = byCode.get(next[0]);
    if (oldPrimary && newPrimary && oldPrimary.code !== newPrimary.code) {
      const chapter = remapPsalmChapter(oldPrimary.lxxPsalms, newPrimary.lxxPsalms, place.bookCode, place.chapter);
      if (chapter !== place.chapter) goToPlace({ bookCode: place.bookCode, chapter });
    }
    // A layout picked for one count rarely suits another; fall back to the recommended one.
    if (next.length !== codes.length) setLayoutChoice(null);
    setCodes(next);
  }

  function addCode(code: string) {
    if (codes.includes(code) || codes.length >= MAX_PROJECTOR_TRANSLATIONS) return;
    setCodesWithPlace([...codes, code]);
  }

  function removeCode(code: string) {
    if (codes.length <= 1) return;
    setCodesWithPlace(codes.filter((c) => c !== code));
  }

  function moveCode(from: number, to: number) {
    if (from === to || to < 0 || to >= codes.length) return;
    const next = [...codes];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setCodesWithPlace(next);
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────
  const pickerRef = useRef<HTMLDivElement>(null);
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Text entry keeps its keys; a focused switch must not swallow B, F or the arrows.
      if (target.matches('input:not([type="checkbox"]), textarea, select') || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (key === 'ArrowRight' || key === 'ArrowDown' || key === ' ') {
        e.preventDefault();
        if (e.shiftKey || !turnPart(1)) step(1, e.shiftKey);
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        e.preventDefault();
        if (e.shiftKey || !turnPart(-1)) step(-1, e.shiftKey);
      } else if (key === 'Enter') {
        // Enter on a control activates that control; on a verse row it shows.
        if (target.closest('button') && !target.closest('.bp-verse__main')) return;
        e.preventDefault();
        // A split verse is read to its end before the cued one comes up.
        if (!(autoCuedRef.current && turnPart(1)) && preview.length > 0) showVerses(preview);
      } else if (key === 'b' || key === 'B') {
        e.preventDefault();
        setBlank((v) => !v);
      } else if (key === 'f' || key === 'F') {
        e.preventDefault();
        toggleFreeze();
      } else if (key === 'g' || key === 'G') {
        e.preventDefault();
        pickerRef.current?.querySelector('input')?.focus();
      } else if (['1', '2', '3', '4'].includes(key)) {
        const l = PROJECTOR_LAYOUTS[Number(key) - 1];
        if (count > 1) setLayoutChoice(l);
      } else if (key === '+' || key === '=') {
        setScale((s) => PROJECTOR_SCALES[Math.min(PROJECTOR_SCALES.length - 1, PROJECTOR_SCALES.indexOf(s) + 1)]);
      } else if (key === '-') {
        setScale((s) => PROJECTOR_SCALES[Math.max(0, PROJECTOR_SCALES.indexOf(s) - 1)]);
      } else if (key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false);
        else onClose();
      }
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    const onShift = (e: KeyboardEvent) => setExtending(e.shiftKey);
    const onBlur = () => setExtending(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onShift);
    window.addEventListener('keyup', onShift);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keydown', onShift);
      window.removeEventListener('keyup', onShift);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Keep the Live / Vorschau rows in view in the verse list.
  const rowRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const previewTop = preview[0];
  useEffect(() => {
    if (previewTop === undefined) return;
    rowRefs.current.get(previewTop)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [previewTop]);

  // ── Drag to reorder ─────────────────────────────────────────────────────────
  const listRef = useRef<HTMLOListElement>(null);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  function onHandlePointerDown(e: React.PointerEvent<HTMLButtonElement>, from: number) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ from, to: from });
  }
  function onHandlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!drag || !listRef.current) return;
    const items = [...listRef.current.querySelectorAll<HTMLElement>('[data-slot]')];
    let to = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        to = i;
        break;
      }
    }
    if (to !== drag.to) setDrag({ from: drag.from, to });
  }
  function onHandlePointerUp() {
    if (drag) moveCode(drag.from, drag.to);
    setDrag(null);
  }

  if (!mounted) return null;

  const hallName = hall.slide ? `${hall.slide.sides[0]?.bookName ?? ''} ${slideReference(hall.slide)}` : null;
  const previewName = previewSlide ? `${previewSlide.sides[0]?.bookName ?? ''} ${slideReference(previewSlide)}` : '';
  const liveVerses = new Set(
    live && passage && live.bookCode === passage.bookCode && live.chapter === passage.chapter
      ? live.rows.map((r) => r.verse)
      : []
  );
  const previewSet = new Set(preview);
  const available = translations.filter((tr) => !codes.includes(tr.code));
  const full = codes.length >= MAX_PROJECTOR_TRANSLATIONS;
  const connected = display !== null;
  const layoutLabels: Record<ProjectorLayout, string> = {
    rows: t('prLayoutRows'),
    columns: t('prLayoutColumns'),
    grid: t('prLayoutGrid'),
    focus: t('prLayoutFocus'),
  };
  const themeLabels: Record<ProjectorTheme, string> = {
    violet: t('prThemeViolet'),
    graphite: t('prThemeGraphite'),
    ink: t('prThemeInk'),
    paper: t('prThemePaper'),
  };
  const splitLive = hall.slide && liveParts > 1;

  // Plain words, no dot: what the room sees right now.
  const hallStatus = hall.blank
    ? t('prBlank')
    : hall.frozen
      ? t('prInHallFrozen')
      : hallName
        ? `${t('prLiveSummary', { reference: hallName, count: hall.slide?.sides.length ?? 0 })}${
            splitLive ? ` · ${t('prPart', { n: Math.min(hall.part, liveParts - 1) + 1, total: liveParts })}` : ''
          }`
        : t('prLiveNothing');
  const statusPill = (
    <div className={`bp-status${hall.blank ? ' is-blank' : ''}`} role="status">
      <strong>{t('prInHall')}</strong>
      <span className="bp-status__text">· {hallStatus}</span>
    </div>
  );

  const settingsPanel = (
    <div className="bp-panel">
      <div className="bp-panel__title">
        <h2>{t('prSettings')}</h2>
        <button
          type="button"
          className="bp-icon-btn bp-close"
          onClick={() => setSettingsOpen(false)}
          aria-label={t('close')}
        >
          ×
        </button>
      </div>
      <div className="bp-panel__head">
        <span className="bp-eyebrow">{t('prTranslations')}</span>
        <span className="bp-panel__count">{t('prCountOf', { n: codes.length, max: MAX_PROJECTOR_TRANSLATIONS })}</span>
      </div>
      <ol className="bp-selected" ref={listRef}>
        {codes.map((code, i) => {
          const tr = byCode.get(code);
          const isDropTarget = drag && drag.to === i && drag.from !== i;
          return (
            <li
              key={code}
              data-slot
              className={`bp-selected__item${drag?.from === i ? ' is-dragging' : ''}${
                isDropTarget ? (drag.to < drag.from ? ' is-drop-before' : ' is-drop-after') : ''
              }`}
            >
              <button
                type="button"
                className="bp-handle"
                aria-label={t('prDragHandle', { name: tr?.name ?? code })}
                onPointerDown={(e) => onHandlePointerDown(e, i)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    moveCode(i, i - 1);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                    moveCode(i, i + 1);
                  }
                }}
              >
                <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
                  {[3, 8, 13].map((y) => (
                    <Fragment key={y}>
                      <circle cx="2.5" cy={y} r="1.3" />
                      <circle cx="7.5" cy={y} r="1.3" />
                    </Fragment>
                  ))}
                </svg>
              </button>
              <span className="bp-selected__num">{i + 1}</span>
              <span className="bp-selected__name">
                <span className="bp-selected__title">
                  <strong>{tr ? projectorLabel(tr) : code}</strong> {languageName(tr?.language ?? '', locale)}
                </span>
                <span className="bp-selected__sub">{tr?.name}</span>
              </span>
              {i > 0 && (
                <button
                  type="button"
                  className="bp-remove"
                  onClick={() => removeCode(code)}
                  aria-label={`${t('prRemove')}: ${tr?.name ?? code}`}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {!full && available.length > 0 && (
        <button
          type="button"
          className="bp-add-slot"
          onClick={() =>
            document.getElementById('bp-available')?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
          }
        >
          + {t('prAddTranslation')}
        </button>
      )}
      <p className="bp-note">{full ? t('prMaxReached') : t('prSortHint')}</p>

      {available.length > 0 && (
        <>
          <span className="bp-eyebrow bp-eyebrow--section">{t('prAvailable')}</span>
          <ul className="bp-available" id="bp-available">
            {available.map((tr) => {
              const refused = !tr.license.allowProjector;
              return (
                <li key={tr.code}>
                  <button
                    type="button"
                    className={`bp-available__item${refused ? ' is-refused' : ''}`}
                    onClick={() => addCode(tr.code)}
                    disabled={refused || full}
                  >
                    <span className="bp-available__text">
                      <strong>{projectorLabel(tr)}</strong>
                      <span>
                        {tr.name} · {tr.language}
                      </span>
                      {refused && <em>{t('prNotLicensed')}</em>}
                    </span>
                    {!refused && <span className="bp-available__plus">+</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <span className="bp-eyebrow bp-eyebrow--section">{t('prBackground')}</span>
      <div className="bp-themes" role="radiogroup" aria-label={t('prBackground')}>
        {PROJECTOR_THEMES.map((th) => (
          <button
            key={th}
            type="button"
            role="radio"
            aria-checked={theme === th}
            className={`bp-theme${theme === th ? ' is-active' : ''}`}
            onClick={() => setTheme(th)}
          >
            <span className={`bp-theme__swatch bp-theme__swatch--${th}`} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="bp-theme__name">{themeLabels[th]}</span>
          </button>
        ))}
      </div>

      <div className="bp-toggles">
        <Toggle
          label={t('prAllBookNames')}
          on={options.allBookNames}
          onChange={(v) => setOptions((o) => ({ ...o, allBookNames: v }))}
        />
        <Toggle label={t('prLabels')} on={options.labels} onChange={(v) => setOptions((o) => ({ ...o, labels: v }))} />
        <Toggle label={t('prDirectShow')} on={directShow} onChange={setDirectShow} />
      </div>
      <p className="bp-note bp-note--dot">{t('prLicenseAlways')}</p>
    </div>
  );

  return createPortal(
    <div className={`bp bp--${theme}`} role="dialog" aria-modal="true" aria-label={t('presenter')}>
      <header className="bp-head">
        <Wordmark className="bp-brand" />
        <span className="bp-head__divider" />
        <span className="bp-head__title">{t('presenter')}</span>
        <div className="bp-head__status">{statusPill}</div>
        <div className="bp-layouts" role="radiogroup" aria-label={t('prLayoutAria')}>
          {PROJECTOR_LAYOUTS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={layout === l}
              className={`bp-layout${layout === l ? ' is-active' : ''}`}
              onClick={() => setLayoutChoice(l)}
              disabled={count === 1 && l !== 'rows'}
              title={`${layoutLabels[l]} (${LAYOUT_KEYS[l]})`}
            >
              <LayoutIcon layout={l} />
              <span>{layoutLabels[l]}</span>
            </button>
          ))}
        </div>
        <span className="bp-head__divider" />
        <div className="bp-font">
          <button
            type="button"
            onClick={() => setScale((s) => PROJECTOR_SCALES[Math.max(0, PROJECTOR_SCALES.indexOf(s) - 1)])}
            disabled={scale === PROJECTOR_SCALES[0]}
            aria-label={t('decreaseFont')}
          >
            A−
          </button>
          <span className="bp-font__value">{t('prAuto', { px: liveFit?.px ?? previewFit?.px ?? '—' })}</span>
          <button
            type="button"
            onClick={() =>
              setScale((s) => PROJECTOR_SCALES[Math.min(PROJECTOR_SCALES.length - 1, PROJECTOR_SCALES.indexOf(s) + 1)])
            }
            disabled={scale === PROJECTOR_SCALES[PROJECTOR_SCALES.length - 1]}
            aria-label={t('increaseFont')}
          >
            A+
          </button>
        </div>
        <span className="bp-head__divider" />
        <button
          ref={settingsButtonRef}
          type="button"
          className={`bp-head-btn${settingsOpen ? ' is-active' : ''}`}
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
          aria-controls="bp-settings"
        >
          {t('prSettings')}
        </button>
        <button
          type="button"
          className={`bp-icon-btn bp-keys-btn${keysOpen ? ' is-active' : ''}`}
          onClick={() => (keysOpen ? closeKeys() : setKeysOpen(true))}
          aria-expanded={keysOpen}
          aria-controls="bp-keys"
          aria-label={t('prKeyboard')}
          title={t('prKeyboard')}
        >
          ?
        </button>
        <button
          type="button"
          className="bp-icon-btn"
          onClick={() => channelRef.current?.postMessage({ type: 'requestFullscreen' } satisfies ProjectorMessage)}
          disabled={!connected}
          aria-label={t('fullscreenAria')}
          title={t('fullscreenAria')}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
            <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className="bp-icon-btn bp-close" onClick={onClose} aria-label={t('close')}>
          ×
        </button>
      </header>

      <div className="bp-body">
        {/* Everything that is set up before a service, out of the way during it. */}
        {settingsOpen && (
          <button
            type="button"
            className="bp-settings__scrim"
            tabIndex={-1}
            aria-label={t('close')}
            onClick={() => setSettingsOpen(false)}
          />
        )}
        <aside
          id="bp-settings"
          ref={settingsPanelRef}
          className={`bp-settings${settingsOpen ? ' is-open' : ''}`}
          aria-label={t('prSettings')}
          inert={!settingsOpen}
        >
          {settingsPanel}
        </aside>

        <section className="bp-col bp-col--verses" aria-label={t('ariaVerseList')}>
          <div className="bp-search" ref={pickerRef}>
            <BiblePassagePicker
              books={books}
              onPick={(target: PassageTarget) =>
                goToPlace({ bookCode: target.bookCode, chapter: target.chapter, verse: target.verse })
              }
              placeholder={`${currentBook?.name ?? ''} ${place.chapter} — ${t('prSearchHint')}`}
            />
            <kbd className="bp-kbd bp-search__key">G</kbd>
          </div>
          <div className="bp-chapter">
            <button
              type="button"
              className="bp-chapter__nav"
              onClick={() => prevChapter && goToPlace(prevChapter)}
              disabled={!prevChapter}
              aria-label={t('previousChapter')}
            >
              ‹
            </button>
            <h2 className="bp-chapter__title">
              {currentBook?.name ?? place.bookCode} {place.chapter}
            </h2>
            <button
              type="button"
              className="bp-chapter__nav"
              onClick={() => nextChapter && goToPlace(nextChapter)}
              disabled={!nextChapter}
              aria-label={t('nextChapter')}
            >
              ›
            </button>
            {count > 1 && (
              <div className="bp-tabs" role="tablist" aria-label={t('prListTranslation')}>
                {codes.map((code, i) => (
                  <button
                    key={code}
                    type="button"
                    role="tab"
                    aria-selected={listIndex === i}
                    className={`bp-tab${listIndex === i ? ' is-active' : ''}`}
                    onClick={() => setListIndex(i)}
                  >
                    {label(code)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loadFailed && <p className="bp-error">{t('prUnavailable')}</p>}

          <ol className="bp-verses">
            {passage?.verses.map((v) => {
              const isLive = liveVerses.has(v.verse);
              const isPreview = previewSet.has(v.verse);
              // While Shift is held, verses a range from the anchor cannot reach look unavailable.
              const unreachable = extending && anchor !== null && !withinRangeCap(verseNumbers, anchor, v.verse);
              return (
                <li
                  key={v.verse}
                  ref={(el) => {
                    if (el) rowRefs.current.set(v.verse, el);
                    else rowRefs.current.delete(v.verse);
                  }}
                  className={`bp-verse${isLive ? ' is-live' : ''}${isPreview ? ' is-preview' : ''}${
                    unreachable ? ' is-unreachable' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="bp-verse__main"
                    onClick={(e) =>
                      pickVerse(v.verse, e.shiftKey ? 'extend' : e.metaKey || e.ctrlKey ? 'toggle' : 'single')
                    }
                    onDoubleClick={() => showVerses([v.verse])}
                    aria-pressed={isPreview}
                    aria-current={isLive || undefined}
                    aria-label={t('selectVerseAria', { n: v.verse })}
                  >
                    <VerseNumber n={v.verse} state={isLive ? 'hall' : isPreview ? 'preview' : null} />
                    <span className="bp-verse__text">{v.texts[listIndex] ?? '—'}</span>
                  </button>
                  {!isLive && !isPreview && (
                    <button type="button" className="bp-verse__show" onClick={() => showVerses([v.verse])}>
                      <svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true">
                        <path d="M2 1l6 4-6 4z" fill="currentColor" />
                      </svg>
                      {t('prShow')}
                    </button>
                  )}
                  {isLive && count > 1 && (
                    <div className="bp-verse__others">
                      {passage.sides.map((side, i) =>
                        i === listIndex ? null : (
                          <p key={side.code}>
                            <span>{side.abbreviation}</span> {v.texts[i] ?? '—'}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="bp-hint" role="status">
            {rangeCapped || (extending && preview.length >= MAX_SLIDE_VERSES)
              ? t('prRangeCap', { max: MAX_SLIDE_VERSES })
              : directShow
                ? t('prListHintDirect')
                : t('prListHint')}
          </p>
        </section>

        <section className="bp-col bp-col--live">
          <div className="bp-live-head">
            <span className="bp-live-head__label">{t('prLiveCaption')}</span>
            <span className="bp-live-head__status">{statusPill}</span>
            <span className="bp-live-head__conn">
              {connected ? t('prConnected', { w: display.width, h: display.height }) : t('prDisconnected')}
            </span>
          </div>

          {hall.frozen && (
            <p className="bp-banner" role="status">
              <span className="bp-banner__icon" aria-hidden="true" />
              {t('prFrozenBanner', { live: hallName ?? '—', preview: previewName || '—' })}
            </p>
          )}

          {/* Always rendered — its auto-fit tells the console how many screens
              the live slide needs, display window or not. */}
          <div className={`bp-mirror${hall.slide && !hall.blank ? ' is-live' : ''}${connected ? '' : ' is-offline'}`}>
            <ProjectorFrame fit="width">
              <ProjectorSlide
                slide={hall.slide}
                layout={hall.layout}
                theme={hall.theme}
                scale={hall.scale}
                options={hall.options}
                part={hall.part}
                blank={hall.blank}
                onFit={setLiveFit}
              />
            </ProjectorFrame>
            {connected && hall.blank && (
              <button type="button" className="bp-mirror__blank" onClick={() => setBlank(false)}>
                <strong>{t('prBlankTitle')}</strong>
                <span>{t('prBlankBody')}</span>
              </button>
            )}
            {!connected && (
              <div className="bp-offline">
                <span className="bp-offline__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{t('connecting')}</strong>
                <span>{t('prConnectHint')}</span>
                <button
                  type="button"
                  className="bp-btn bp-btn--accent"
                  onClick={() => onOpenDisplay(codes, place.bookCode, place.chapter)}
                >
                  {t('prOpenDisplay')}
                </button>
              </div>
            )}
          </div>

          <div className="bp-cue">
            <div className="bp-cue__preview">
              <span className="bp-eyebrow">
                {t('prPreview')}
                {previewSlide ? ` · ${slideReference(previewSlide)}` : ''}
              </span>
              <div className="bp-thumb">
                <ProjectorFrame fit="width">
                  <ProjectorSlide
                    slide={previewSlide}
                    layout={layout}
                    theme={theme}
                    scale={scale}
                    options={options}
                    onFit={setPreviewFit}
                  />
                </ProjectorFrame>
              </div>
              {previewFit?.overflow ? (
                <p className="bp-warn">{t('prOverflow')}</p>
              ) : (
                previewFit &&
                previewFit.parts > 1 && <p className="bp-note">{t('prSplitPreview', { total: previewFit.parts })}</p>
              )}
            </div>
            <div className="bp-controls">
              <div className="bp-controls__row">
                <button
                  type="button"
                  className="bp-btn bp-btn--square"
                  onClick={() => turnPart(-1) || step(-1)}
                  aria-label={t('prPrev')}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="bp-btn bp-btn--accent bp-btn--show"
                  onClick={() => (autoCuedRef.current && turnPart(1)) || showVerses(preview)}
                  disabled={preview.length === 0}
                >
                  {t('prShow')} <kbd className="bp-kbd">Enter</kbd>
                </button>
                <button
                  type="button"
                  className="bp-btn bp-btn--square"
                  onClick={() => turnPart(1) || step(1)}
                  aria-label={t('prNext')}
                >
                  ›
                </button>
              </div>
              <div className="bp-controls__row">
                <button
                  type="button"
                  className={`bp-btn bp-btn--quiet${blank ? ' is-active' : ''}`}
                  onClick={() => setBlank((v) => !v)}
                  aria-pressed={blank}
                >
                  {t('prBlank')} <kbd className="bp-kbd">B</kbd>
                </button>
                <button
                  type="button"
                  className={`bp-btn bp-btn--quiet${frozen ? ' is-active' : ''}`}
                  onClick={toggleFreeze}
                  aria-pressed={!!frozen}
                >
                  {frozen ? t('prFrozen') : t('prFreeze')} <kbd className="bp-kbd">F</kbd>
                </button>
              </div>
              {hall.slide && liveFit?.overflow && <p className="bp-warn">{t('prOverflow')}</p>}
              {splitLive && !hall.frozen && hall.part < liveParts - 1 ? (
                <p className="bp-note bp-note--split" role="status">
                  {t('prSplitLive', { total: liveParts, next: hall.part + 2 })}
                </p>
              ) : (
                <p className="bp-note">{t('prFreezeHint')}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer id="bp-keys" className="bp-keys" aria-label={t('prKeyboard')} hidden={!keysOpen}>
        <span className="bp-eyebrow">{t('prKeyboard')}</span>
        <KeyHint keys={['←', '→']} label={t('prKeyVerse')} />
        <KeyHint keys={['Shift', '→']} label={t('prKeyRange')} />
        <KeyHint keys={['Enter']} label={t('prShow')} />
        <KeyHint keys={['B']} label={t('prBlank')} />
        <KeyHint keys={['F']} label={t('prFreeze')} />
        <KeyHint keys={['1', '4']} joiner="–" label={t('prKeyLayout')} />
        <KeyHint keys={['+', '−']} label={t('prKeyFont')} />
        <KeyHint keys={['G']} label={t('prKeySearch')} />
        <KeyHint keys={['Esc']} label={t('prKeyClose')} />
        <button type="button" className="bp-icon-btn bp-keys__close" onClick={closeKeys} aria-label={t('close')}>
          ×
        </button>
      </footer>
    </div>,
    document.body
  );
}

/**
 * The verse number in the list, drawn inside a small 16:9 screen when the
 * verse is on the room's screen (solid, accent) or cued in the Vorschau
 * (dashed). The text beside it is never dimmed, so the operator can read on.
 */
function VerseNumber({ n, state }: { n: number; state: 'hall' | 'preview' | null }) {
  return <span className={`bp-vnum${state ? ` bp-vnum--${state}` : ''}`}>{n}</span>;
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="bp-toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="bp-toggle__track" aria-hidden="true" />
    </label>
  );
}

function KeyHint({ keys, label, joiner }: { keys: string[]; label: string; joiner?: string }) {
  return (
    <span className="bp-keyhint">
      {keys.map((k, i) => (
        <Fragment key={k}>
          {i > 0 && joiner && <span className="bp-keyhint__joiner">{joiner}</span>}
          <kbd className="bp-kbd">{k}</kbd>
        </Fragment>
      ))}
      <span>{label}</span>
    </span>
  );
}

function LayoutIcon({ layout }: { layout: ProjectorLayout }) {
  const rects: [number, number, number, number][] =
    layout === 'rows'
      ? [
          [0, 0, 18, 3],
          [0, 5, 18, 3],
          [0, 10, 18, 3],
        ]
      : layout === 'columns'
        ? [
            [0, 0, 5, 13],
            [6.5, 0, 5, 13],
            [13, 0, 5, 13],
          ]
        : layout === 'grid'
          ? [
              [0, 0, 8.5, 6],
              [9.5, 0, 8.5, 6],
              [0, 7, 8.5, 6],
              [9.5, 7, 8.5, 6],
            ]
          : [
              [0, 0, 18, 6],
              [0, 8, 8.5, 5],
              [9.5, 8, 8.5, 5],
            ];
  return (
    <svg viewBox="0 0 18 13" width="18" height="13" aria-hidden="true" className="bp-layout__icon">
      {rects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="1" />
      ))}
    </svg>
  );
}
