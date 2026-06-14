'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { SongDto, SongPartDto } from '@sdarm/types';
import { expandParts, buildLineSlides, getOriginalParts, getAvailableLanguages } from '@/app/lib/format';
import type { LineSlide } from '@/app/lib/format';
import type { TransitionType } from './Projector';
import ChordLine from './ChordLine';

interface PresenterControlsProps {
  t: ReturnType<typeof useTranslations<'songbook.presenter'>>;
  fontScale: number;
  setFontScale: (fn: (s: number) => number) => void;
  transition: TransitionType;
  setTransition: (t: TransitionType) => void;
  lineMode: boolean;
  setLineMode: (fn: (m: boolean) => boolean) => void;
  linesPerSlide: 1 | 2;
  setLinesPerSlide: (v: 1 | 2) => void;
  showTranslation: boolean;
  setShowTranslation: (fn: (v: boolean) => boolean) => void;
  hasTranslations: boolean;
  showPartLabel: boolean;
  setShowPartLabel: (fn: (v: boolean) => boolean) => void;
  connected: boolean;
  channelRef: React.RefObject<BroadcastChannel | null>;
  lineSlides: LineSlide[];
  primaryLang: string | null;
  setPrimaryLang: (lang: string | null) => void;
  availableLanguages: string[];
  hasMultipleLanguages: boolean;
  allCaps: boolean;
  setAllCaps: (fn: (v: boolean) => boolean) => void;
}

function PresenterControls({
  t,
  fontScale,
  setFontScale,
  transition,
  setTransition,
  lineMode,
  setLineMode,
  linesPerSlide,
  setLinesPerSlide,
  showTranslation,
  setShowTranslation,
  hasTranslations,
  showPartLabel,
  setShowPartLabel,
  connected,
  channelRef,
  lineSlides,
  primaryLang,
  setPrimaryLang,
  availableLanguages,
  hasMultipleLanguages,
  allCaps,
  setAllCaps,
}: PresenterControlsProps) {
  return (
    <div className="presenter__controls">
      {/* Row 1 — always visible: font size + fullscreen + transition picker */}
      <div className="presenter__ctrl-main">
        <button
          className="presenter__tb-btn"
          onClick={() => setFontScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
          title={t('decreaseFont')}
        >
          A−
        </button>
        <span className="presenter__tb-scale">{Math.round(fontScale * 100)}%</span>
        <button
          className="presenter__tb-btn"
          onClick={() => setFontScale((s) => Math.min(2, +(s + 0.15).toFixed(2)))}
          title={t('increaseFont')}
        >
          A+
        </button>
        <button
          className="presenter__tb-btn presenter__tb-btn--icon presenter__fs-hint"
          onClick={() => channelRef.current?.postMessage({ type: 'requestFullscreen' })}
          title={t('fullscreenDisplay')}
          disabled={!connected}
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            width="14"
            height="14"
            aria-hidden
          >
            <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <kbd>F</kbd>
        </button>
        <div className="presenter__ctrl-sep" />
        {(
          [
            {
              id: 'none',
              icon: (
                <svg viewBox="0 0 16 10" fill="currentColor" width="14" height="9" aria-hidden>
                  <rect x="2" y="2" width="12" height="6" rx="1.5" />
                </svg>
              ),
            },
            {
              id: 'fade',
              icon: (
                <svg viewBox="0 0 16 10" fill="currentColor" width="14" height="9" aria-hidden>
                  <rect x="2" y="2" width="12" height="6" rx="1.5" opacity="0.2" />
                  <rect x="4" y="2" width="10" height="6" rx="1" opacity="0.5" />
                  <rect x="6" y="2" width="8" height="6" rx="0.8" />
                </svg>
              ),
            },
            {
              id: 'slide',
              icon: (
                <svg
                  viewBox="0 0 18 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="16"
                  height="9"
                  aria-hidden
                >
                  <rect x="1" y="1.5" width="9" height="7" rx="1.5" />
                  <path d="M13 5h4M15 3l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
            {
              id: 'zoom',
              icon: (
                <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="12"
                  height="12"
                  aria-hidden
                >
                  <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
            {
              id: 'rise',
              icon: (
                <svg
                  viewBox="0 0 16 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="14"
                  height="10"
                  aria-hidden
                >
                  <rect x="2" y="6" width="12" height="5" rx="1.5" />
                  <path d="M8 5V1M6 3l2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
            {
              id: 'blur',
              icon: (
                <svg
                  viewBox="0 0 16 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  width="14"
                  height="9"
                  aria-hidden
                >
                  <path d="M3 5h10" strokeLinecap="round" />
                  <path d="M4 3h8" strokeLinecap="round" opacity="0.5" />
                  <path d="M4 7h8" strokeLinecap="round" opacity="0.5" />
                  <path d="M6 1h4" strokeLinecap="round" opacity="0.25" />
                  <path d="M6 9h4" strokeLinecap="round" opacity="0.25" />
                </svg>
              ),
            },
          ] as { id: TransitionType; icon: React.ReactNode }[]
        ).map(({ id, icon }) => (
          <button
            key={id}
            className={`presenter__tb-btn presenter__tb-btn--icon${transition === id ? ' presenter__tb-btn--active' : ''}`}
            onClick={() => setTransition(id)}
            title={t(`transition_${id}` as Parameters<typeof t>[0])}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Row 2 — only when song has line data: line mode toggle + options */}
      {lineSlides.length > 0 && (
        <div className="presenter__ctrl-main">
          {/* Line mode toggle — SVG: three bars, first one solid */}
          <button
            className={`presenter__tb-btn presenter__tb-btn--icon${lineMode ? ' presenter__tb-btn--active' : ''}`}
            onClick={() => setLineMode((m) => !m)}
            title={t('lineMode')}
          >
            <svg viewBox="0 0 20 14" width="17" height="12" fill="currentColor" aria-hidden="true">
              <rect x="2" y="0.5" width="16" height="2.5" rx="1.2" />
              <rect x="2" y="5.5" width="12" height="2.5" rx="1.2" opacity="0.3" />
              <rect x="2" y="11" width="14" height="2.5" rx="1.2" opacity="0.3" />
            </svg>
          </button>
          {/* Sub-options: always visible; dimmed/disabled when line mode is off */}
          <button
            className={`presenter__tb-btn presenter__tb-btn--narrow${lineMode && linesPerSlide === 1 ? ' presenter__tb-btn--active' : ''}${!lineMode ? ' presenter__tb-btn--pending' : ''}`}
            onClick={() => setLinesPerSlide(1)}
            disabled={!lineMode}
            title={t('linesPerSlide1')}
          >
            ×1
          </button>
          <button
            className={`presenter__tb-btn presenter__tb-btn--narrow${lineMode && linesPerSlide === 2 ? ' presenter__tb-btn--active' : ''}${!lineMode ? ' presenter__tb-btn--pending' : ''}`}
            onClick={() => setLinesPerSlide(2)}
            disabled={!lineMode}
            title={t('linesPerSlide2')}
          >
            ×2
          </button>
          {/* Part label — SVG: hashtag */}
          <button
            className={`presenter__tb-btn presenter__tb-btn--icon${lineMode && showPartLabel ? ' presenter__tb-btn--active' : ''}${!lineMode ? ' presenter__tb-btn--pending' : ''}`}
            onClick={() => setShowPartLabel((v) => !v)}
            disabled={!lineMode}
            title={t('showPartLabel')}
          >
            <svg
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              width="13"
              height="13"
              aria-hidden="true"
            >
              <line x1="3" y1="4" x2="11" y2="4" />
              <line x1="3" y1="10" x2="11" y2="10" />
              <line x1="5" y1="1.5" x2="4" y2="12.5" />
              <line x1="10" y1="1.5" x2="9" y2="12.5" />
            </svg>
          </button>
          {/* Translation — SVG: two text blocks (original + translation) */}
          {hasTranslations && (
            <button
              className={`presenter__tb-btn presenter__tb-btn--icon${lineMode && showTranslation ? ' presenter__tb-btn--active' : ''}${!lineMode ? ' presenter__tb-btn--pending' : ''}`}
              onClick={() => setShowTranslation((v) => !v)}
              disabled={!lineMode}
              title={t('showTranslation')}
            >
              <svg
                viewBox="0 0 20 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                width="16"
                height="11"
                aria-hidden="true"
              >
                <path d="M2 3h8M2 7h5" strokeLinecap="round" />
                <path d="M11 7h7M11 11h5" strokeLinecap="round" opacity="0.5" />
              </svg>
            </button>
          )}
          {hasMultipleLanguages && (
            <>
              <div className="presenter__ctrl-sep" />
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  className={`presenter__tb-btn presenter__tb-btn--narrow${primaryLang === lang ? ' presenter__tb-btn--active' : ''}${!lineMode ? ' presenter__tb-btn--pending' : ''}`}
                  onClick={() => setPrimaryLang(primaryLang === lang ? null : lang)}
                  disabled={!lineMode}
                  title={t('primaryLang', { lang: lang.toUpperCase() })}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </>
          )}
          <div className="presenter__ctrl-sep" />
          <button
            className={`presenter__tb-btn presenter__tb-btn--narrow${lineMode && allCaps ? ' presenter__tb-btn--active' : ''}${!lineMode ? ' presenter__tb-btn--pending' : ''}`}
            onClick={() => setAllCaps((v: boolean) => !v)}
            disabled={!lineMode}
            title={t('allCaps')}
          >
            AA
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  song: SongDto;
  onClose: () => void;
  onReopenDisplay?: () => void;
}

interface SlideViewProps {
  song: SongDto;
  index: number;
  parts: SongPartDto[];
  verseNumbers: (number | null)[];
  partT: (key: string) => string;
  variant: 'current' | 'next';
}

function SlideView({ song, index, parts, verseNumbers, partT, variant }: SlideViewProps) {
  const total = parts.length + 2;
  const isTitleSlide = index === 0;
  const isAmenSlide = index === total - 1;
  const isPartSlide = !isTitleSlide && !isAmenSlide;
  const part = isPartSlide ? parts[index - 1] : null;
  const lines = part ? part.lyrics.split('\n') : [];

  const bgSymbol = (() => {
    if (isTitleSlide) return String(song.number);
    if (isAmenSlide) return 'Amen';
    const partIndex = index - 1;
    if (part?.type === 'chorus') return partT('chorus').slice(0, 3);
    const vn = verseNumbers[partIndex];
    return vn !== null ? String(vn) : null;
  })();

  return (
    <div className={`pres-slide pres-slide--${variant}${isTitleSlide ? ' pres-slide--title-slide' : ''}`}>
      {bgSymbol && (
        <div
          className={`pres-slide__bg${isTitleSlide || isAmenSlide ? ' pres-slide__bg--center' : ''}${part?.type === 'chorus' ? ' pres-slide__bg--word pres-slide__bg--ref' : ''}${isAmenSlide ? ' pres-slide__bg--word' : ''}`}
          aria-hidden
        >
          {bgSymbol}
        </div>
      )}
      <div className="pres-slide__body">
        {isTitleSlide ? (
          <div className="pres-slide__title">{song.title}</div>
        ) : isPartSlide ? (
          <div className="pres-slide__lyrics">
            {lines.map((line, i) => (
              <ChordLine key={i} line={line} showChords={false} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PresenterDashboard({ song, onClose, onReopenDisplay }: Props) {
  const t = useTranslations('songbook.presenter');
  const partT = useTranslations('songbook.partTypes');
  const parts = expandParts(getOriginalParts(song.parts));
  const lineSlides = buildLineSlides(song.parts);
  const total = parts.length + 2;

  const [index, setIndex] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lineMode, setLineMode] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [linesPerSlide, setLinesPerSlide] = useState<1 | 2>(1);
  const [transition, setTransition] = useState<TransitionType>('none');
  const [showTranslation, setShowTranslation] = useState(false);
  const [showPartLabel, setShowPartLabel] = useState(true);
  const [blank, setBlank] = useState(false);
  const [primaryLang, setPrimaryLang] = useState<string | null>(null);
  const [allCaps, setAllCaps] = useState(false);
  const [clock, setClock] = useState('');

  useEffect(() => setMounted(true), []);

  // Clock — updates every second
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);
  const prevLine = useCallback(() => setLineIndex((i) => Math.max(0, i - 1)), []);
  const nextLine = useCallback(() => setLineIndex((i) => Math.min(lineSlides.length - 1, i + 1)), [lineSlides.length]);

  // Refs so the channel message handler always sees the latest values
  const indexRef = useRef(0);
  const fontScaleRef = useRef(1);
  const lineModeRef = useRef(false);
  const lineIndexRef = useRef(0);
  const linesPerSlideRef = useRef<1 | 2>(1);
  const transitionRef = useRef<TransitionType>('none');
  const showTranslationRef = useRef(false);
  const showPartLabelRef = useRef(true);
  const blankRef = useRef(false);
  const primaryLangRef = useRef<string | null>(null);
  const allCapsRef = useRef(false);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    fontScaleRef.current = fontScale;
  }, [fontScale]);
  useEffect(() => {
    lineModeRef.current = lineMode;
  }, [lineMode]);
  useEffect(() => {
    lineIndexRef.current = lineIndex;
  }, [lineIndex]);
  useEffect(() => {
    linesPerSlideRef.current = linesPerSlide;
  }, [linesPerSlide]);
  useEffect(() => {
    transitionRef.current = transition;
  }, [transition]);
  useEffect(() => {
    showTranslationRef.current = showTranslation;
  }, [showTranslation]);
  useEffect(() => {
    showPartLabelRef.current = showPartLabel;
  }, [showPartLabel]);
  useEffect(() => {
    blankRef.current = blank;
  }, [blank]);
  useEffect(() => {
    primaryLangRef.current = primaryLang;
  }, [primaryLang]);
  useEffect(() => {
    allCapsRef.current = allCaps;
  }, [allCaps]);

  // BroadcastChannel — keep in sync with the display window
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isSlideRemote = useRef(false);
  const isFontRemote = useRef(false);

  useEffect(() => {
    const BC = (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    if (!BC) return;
    const ch = new BC('projector');
    ch.onmessage = (e) => {
      if (e.data.type === 'ready') {
        setConnected(true);
        ch.postMessage({ type: 'slide', index: indexRef.current });
        ch.postMessage({ type: 'fontScale', value: fontScaleRef.current });
        ch.postMessage({ type: 'lineMode', active: lineModeRef.current });
        ch.postMessage({ type: 'lineIndex', index: lineIndexRef.current });
        ch.postMessage({ type: 'linesPerSlide', value: linesPerSlideRef.current });
        ch.postMessage({ type: 'transition', value: transitionRef.current });
        ch.postMessage({ type: 'showTranslation', value: showTranslationRef.current });
        ch.postMessage({ type: 'showPartLabel', value: showPartLabelRef.current });
        ch.postMessage({ type: 'blank', active: blankRef.current });
        ch.postMessage({ type: 'primaryLang', value: primaryLangRef.current });
        ch.postMessage({ type: 'allCaps', value: allCapsRef.current });
      } else if (e.data.type === 'slide') {
        isSlideRemote.current = true;
        setIndex(e.data.index);
      } else if (e.data.type === 'fontScale') {
        isFontRemote.current = true;
        setFontScale(e.data.value);
      }
    };
    channelRef.current = ch;
    ch.postMessage({ type: 'ping' });
    return () => ch.close();
  }, []);

  useEffect(() => {
    if (isSlideRemote.current) {
      isSlideRemote.current = false;
      return;
    }
    channelRef.current?.postMessage({ type: 'slide', index });
  }, [index]);

  useEffect(() => {
    if (isFontRemote.current) {
      isFontRemote.current = false;
      return;
    }
    channelRef.current?.postMessage({ type: 'fontScale', value: fontScale });
  }, [fontScale]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'lineMode', active: lineMode });
    if (!lineMode) setLineIndex(0);
  }, [lineMode]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'lineIndex', index: lineIndex });
  }, [lineIndex]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'linesPerSlide', value: linesPerSlide });
  }, [linesPerSlide]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'transition', value: transition });
  }, [transition]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'showTranslation', value: showTranslation });
  }, [showTranslation]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'showPartLabel', value: showPartLabel });
  }, [showPartLabel]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'blank', active: blank });
  }, [blank]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'primaryLang', value: primaryLang });
  }, [primaryLang]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'allCaps', value: allCaps });
  }, [allCaps]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        channelRef.current?.postMessage({ type: 'requestFullscreen' });
        return;
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setBlank((b) => !b);
        return;
      }
      if (lineMode) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          nextLine();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          prevLine();
        } else if (e.key === '1') {
          setLinesPerSlide(1);
        } else if (e.key === '2') {
          setLinesPerSlide(2);
        } else if (e.key === 'Escape') {
          setLineMode(false);
        }
      } else {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          next();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          prev();
        } else if (e.key === 'Escape') {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lineMode, next, prev, nextLine, prevLine, onClose]);

  // Slide strip — auto-scroll to active thumb
  const stripRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lineThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index]);

  useEffect(() => {
    lineThumbRefs.current[lineIndex]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [lineIndex]);

  // Precompute verse numbers for the expanded parts list
  let verseCount = 0;
  const verseNumbers = parts.map((p) => {
    if (p.type === 'verse') return ++verseCount;
    return null;
  });

  // Current slide label
  const isTitleSlide = index === 0;
  const isAmenSlide = index === total - 1;
  const isPartSlide = !isTitleSlide && !isAmenSlide;
  const currentPart = isPartSlide ? parts[index - 1] : null;

  const slideLabel = (() => {
    if (isTitleSlide) return t('titleSlide');
    if (isAmenSlide) return 'Amen';
    if (!currentPart) return '';
    if (currentPart.type === 'chorus') return partT('chorus');
    if (currentPart.type === 'verse') return `${partT('verse')} ${verseNumbers[index - 1]}`;
    return partT(currentPart.type as Parameters<typeof partT>[0]);
  })();

  const currentLine = lineSlides[lineIndex];
  const hasNextSlide = index + 1 < total;
  const hasNextLine = lineIndex + 1 < lineSlides.length;

  const availableLanguages = useMemo(() => getAvailableLanguages(lineSlides), [lineSlides]);
  const hasMultipleLanguages = availableLanguages.length > 0;

  // Build slide strip thumbnail label for each slide index
  function thumbLabel(i: number): string {
    if (i === 0) return String(song.number);
    if (i === total - 1) return 'A';
    const p = parts[i - 1];
    if (!p) return '?';
    if (p.type === 'chorus') return 'Ref';
    if (p.type === 'verse') return `V${verseNumbers[i - 1] ?? ''}`;
    return p.type.slice(0, 2).toUpperCase();
  }

  // Build line strip thumbnail label
  function lineThumbLabel(ls: (typeof lineSlides)[0]): string {
    return `${ls.lineIndex + 1}`;
  }

  if (!mounted) return null;

  return createPortal(
    <div className="presenter">
      {/* Header */}
      <div className="presenter__header">
        <div className="presenter__logo">
          SDARM<span className="presenter__logo-accent">.life</span>
        </div>
        <div className="presenter__song-info">
          <span className="presenter__song-num">{song.number}.</span>
          {song.title}
        </div>
        <div className="presenter__header-actions">
          {/* Connection status badge */}
          <div
            className={`presenter__status${connected ? ' presenter__status--connected' : ''}`}
            title={connected ? t('displayConnected') : t('connectingToDisplay')}
          >
            <span className="presenter__status-dot" />
          </div>
          {/* Clock */}
          <span className="presenter__clock">{clock}</span>
          {onReopenDisplay && (
            <button
              className="presenter__reopen-btn"
              onClick={onReopenDisplay}
              title={t('reopenDisplay')}
              aria-label={t('reopenDisplay')}
            >
              <svg viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="13">
                <rect x="1" y="1" width="18" height="12" rx="2" />
                <path d="M6 15h8M10 13v2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button className="presenter__close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>
      </div>

      {/* Slides area */}
      <div className="presenter__slides">
        {lineMode && lineSlides.length > 0 ? (
          <>
            <div className="presenter__panel presenter__panel--current">
              <div className="pres-slide pres-slide--current pres-slide--line">
                <div className="pres-slide__body">
                  {currentLine && (
                    <div className="pres-slide__lyrics">
                      <ChordLine line={currentLine.line} showChords={false} />
                      {linesPerSlide === 2 && lineSlides[lineIndex + 1] && (
                        <ChordLine line={lineSlides[lineIndex + 1].line} showChords={false} />
                      )}
                      {showTranslation &&
                        currentLine.translations.map((tr, ti) => (
                          <div
                            key={ti}
                            className={`pres-slide__translation pres-slide__translation--${tr.translationType}`}
                          >
                            {tr.line}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="presenter__slide-meta">
                {currentLine
                  ? `${currentLine.partLabel || currentLine.partType} · ${lineIndex + 1} / ${lineSlides.length}`
                  : ''}
              </div>
            </div>

            <div className="presenter__panel presenter__panel--next">
              {hasNextLine ? (
                <div className="pres-slide pres-slide--next pres-slide--line">
                  <div className="pres-slide__body">
                    <div className="pres-slide__lyrics">
                      <ChordLine line={lineSlides[lineIndex + 1].line} showChords={false} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pres-slide pres-slide--next pres-slide--end">
                  <span>{t('endOfSong')}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="presenter__panel presenter__panel--current">
              <SlideView
                song={song}
                index={index}
                parts={parts}
                verseNumbers={verseNumbers}
                partT={partT}
                variant="current"
              />
              <div className="presenter__slide-meta">{slideLabel}</div>
            </div>

            <div className="presenter__panel presenter__panel--next">
              {hasNextSlide ? (
                <SlideView
                  song={song}
                  index={index + 1}
                  parts={parts}
                  verseNumbers={verseNumbers}
                  partT={partT}
                  variant="next"
                />
              ) : (
                <div className="pres-slide pres-slide--next pres-slide--end">
                  <span>{t('endOfSong')}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Slide strip — thumbnail row for fast navigation */}
      <div className="presenter__strip" ref={stripRef}>
        {!lineMode
          ? Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                className={`presenter__strip-thumb${i === index ? ' presenter__strip-thumb--active' : ''}${parts[i - 1]?.type === 'chorus' ? ' presenter__strip-thumb--chorus' : ''}${i === 0 || i === total - 1 ? ' presenter__strip-thumb--edge' : ''}`}
                onClick={() => setIndex(i)}
                title={thumbLabel(i)}
              >
                {thumbLabel(i)}
              </button>
            ))
          : lineSlides.map((ls, i) => {
              const isNewPart = i === 0 || ls.partLabel !== lineSlides[i - 1].partLabel;
              return (
                <span key={i} className="presenter__strip-line-group">
                  {isNewPart && <span className="presenter__strip-part">{ls.partLabel}</span>}
                  <button
                    ref={(el) => {
                      lineThumbRefs.current[i] = el;
                    }}
                    className={`presenter__strip-thumb presenter__strip-thumb--line${i === lineIndex ? ' presenter__strip-thumb--active' : ''}${ls.partType === 'chorus' ? ' presenter__strip-thumb--chorus' : ''}`}
                    onClick={() => setLineIndex(i)}
                    title={`${ls.partLabel} · ${ls.lineIndex + 1}`}
                  >
                    {lineThumbLabel(ls)}
                  </button>
                </span>
              );
            })}
      </div>

      {/* Controls bar — below strip, above footer */}
      <PresenterControls
        t={t}
        fontScale={fontScale}
        setFontScale={setFontScale}
        transition={transition}
        setTransition={setTransition}
        lineMode={lineMode}
        setLineMode={setLineMode}
        linesPerSlide={linesPerSlide}
        setLinesPerSlide={setLinesPerSlide}
        showTranslation={showTranslation}
        setShowTranslation={setShowTranslation}
        hasTranslations={lineSlides.some((s) => s.translations.length > 0)}
        showPartLabel={showPartLabel}
        setShowPartLabel={setShowPartLabel}
        connected={connected}
        channelRef={channelRef}
        lineSlides={lineSlides}
        primaryLang={primaryLang}
        setPrimaryLang={setPrimaryLang}
        availableLanguages={availableLanguages}
        hasMultipleLanguages={hasMultipleLanguages}
        allCaps={allCaps}
        setAllCaps={setAllCaps}
      />

      {/* Footer: navigation + blank */}
      <div className="presenter__footer">
        {lineMode && lineSlides.length > 0 ? (
          <>
            <button
              className="presenter__nav-btn presenter__nav-btn--prev"
              onClick={prevLine}
              disabled={lineIndex === 0}
              aria-label={t('previous')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="28" height="28">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="presenter__counter">
              {lineIndex + 1} / {lineSlides.length}
            </span>
            <button
              className="presenter__nav-btn presenter__nav-btn--next"
              onClick={nextLine}
              disabled={lineIndex >= lineSlides.length - 1}
              aria-label={t('next')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="28" height="28">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              className="presenter__nav-btn presenter__nav-btn--prev"
              onClick={prev}
              disabled={index === 0}
              aria-label={t('previous')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="28" height="28">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="presenter__counter">
              {index + 1} / {total}
            </span>
            <button
              className="presenter__nav-btn presenter__nav-btn--next"
              onClick={next}
              disabled={index === total - 1}
              aria-label={t('next')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="28" height="28">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}

        {/* Blank screen button — B key */}
        <div className="presenter__footer-divider" />
        <button
          className={`presenter__blank-btn${blank ? ' presenter__blank-btn--active' : ''}`}
          onClick={() => setBlank((b) => !b)}
          title={`${t('blank')} (B)`}
          aria-label={t('blank')}
        >
          {t('blank')}
        </button>
      </div>
    </div>,
    document.body
  );
}
