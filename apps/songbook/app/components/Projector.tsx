'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { SongDto, SongPartDto } from '@sdarm/types';
import { expandParts, buildLineSlides, getOriginalParts, swapPrimaryLang, getSiteTheme } from '@/app/lib/format';
import type { LineSlide } from '@/app/lib/format';
import ChordLine from './ChordLine';
import { amenLabel, chorusLabel } from './slide-labels';

export type TransitionType = 'none' | 'fade' | 'slide' | 'zoom' | 'rise' | 'blur';

interface Props {
  song: SongDto;
  onClose: () => void;
  isDisplay?: boolean;
}

// Compute the decorative background symbol for any slide index
function getBgSymbolForIdx(
  idx: number,
  total: number,
  parts: SongPartDto[],
  verseNumbers: (number | null)[],
  song: SongDto
): { symbol: string; isCenter: boolean; isWord: boolean; isRef: boolean } | null {
  if (idx === 0) return { symbol: String(song.number), isCenter: true, isWord: false, isRef: false };
  if (idx === total - 1)
    return { symbol: amenLabel(song.songbook.language), isCenter: true, isWord: true, isRef: false };
  const p = parts[idx - 1];
  if (!p) return null;
  if (p.type === 'chorus')
    return { symbol: chorusLabel(song.songbook.language), isCenter: false, isWord: true, isRef: true };
  const vn = verseNumbers[idx - 1];
  if (vn === null) return null;
  return { symbol: String(vn), isCenter: false, isWord: false, isRef: false };
}

function BgSymbol({
  idx,
  total,
  parts,
  verseNumbers,
  song,
  variant,
}: {
  idx: number;
  total: number;
  parts: SongPartDto[];
  verseNumbers: (number | null)[];
  song: SongDto;
  variant?: 'out' | 'in';
}) {
  const info = getBgSymbolForIdx(idx, total, parts, verseNumbers, song);
  if (!info) return null;
  const cls = [
    'projector__bg-symbol',
    info.isCenter && 'projector__bg-symbol--center',
    info.isWord && 'projector__bg-symbol--word',
    info.isRef && 'projector__bg-symbol--ref',
    variant === 'out' && 'projector__bg-symbol--out',
    variant === 'in' && 'projector__bg-symbol--in',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} aria-hidden="true">
      {info.symbol}
    </div>
  );
}

// Renders a single line + optional translations
function LineContent({
  slide,
  showTranslation = false,
}: {
  slide: LineSlide;
  phase: 'idle' | 'exit' | 'enter';
  transition: TransitionType;
  showTranslation?: boolean;
}) {
  return (
    <>
      <ChordLine line={slide.line} showChords={false} />
      {showTranslation &&
        slide.translations.map((tr, ti) => (
          <div key={ti} className={`projector__line-translation projector__line-translation--${tr.translationType}`}>
            {tr.line}
          </div>
        ))}
    </>
  );
}

export default function Projector({ song, onClose, isDisplay }: Props) {
  const t = useTranslations('songbook.projector');
  const parts = expandParts(getOriginalParts(song.parts));
  const lineSlides = buildLineSlides(song.parts);
  // index 0 = title slide; 1..parts.length = song parts; parts.length+1 = amen slide
  const total = parts.length + 2;
  const [index, setIndex] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [slideTheme, setSlideTheme] = useState<'dark' | 'light'>(getSiteTheme);
  const [mounted, setMounted] = useState(false);
  const [display, setDisplay] = useState(isDisplay);
  const [pendingFullscreen, setPendingFullscreen] = useState(false);
  // Line-by-line mode state (controlled by PresenterDashboard via BroadcastChannel)
  const [lineMode, setLineMode] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  // linesPerSlide: 1 = solo (current only), 2 = current + next preview below
  const [linesPerSlide, setLinesPerSlide] = useState<1 | 2>(2);
  // Transition state
  const [transition, setTransition] = useState<TransitionType>('none');
  const [showTranslation, setShowTranslation] = useState(false);
  const [allCaps, setAllCaps] = useState(false);
  const [showPartLabel, setShowPartLabel] = useState(true);
  const [blank, setBlank] = useState(false);
  const [primaryLang, setPrimaryLang] = useState<string | null>(null);
  // Two-layer transition: exiting = old content, entering = new content (simultaneous)
  const [exitingLineIdx, setExitingLineIdx] = useState<number | null>(null);
  const [enteringLineIdx, setEnteringLineIdx] = useState<number | null>(null);
  const [displayLineIdx, setDisplayLineIdx] = useState(0);
  const [prevLineIdx, setPrevLineIdx] = useState<number | null>(null);
  const [exitingIdx, setExitingIdx] = useState<number | null>(null);
  const [enteringIdx, setEnteringIdx] = useState<number | null>(null);
  const [displayIdx, setDisplayIdx] = useState(0);
  const lineTransTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideTransTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);
  const openFullscreen = useCallback(() => {
    setDisplay(false);
  }, []);

  // Sync displayIdx with index (with transition if needed)
  useEffect(() => {
    if (transition === 'none' || lineMode) {
      setDisplayIdx(index);
      setExitingIdx(null);
      setEnteringIdx(null);
      return;
    }
    if (slideTransTimerRef.current) clearTimeout(slideTransTimerRef.current);
    setExitingIdx(displayIdx);
    setEnteringIdx(index);
    slideTransTimerRef.current = setTimeout(() => {
      setDisplayIdx(index);
      setExitingIdx(null);
      setEnteringIdx(null);
    }, 1000);
  }, [index]);

  // Sync displayLineIdx with lineIndex (with transition if needed)
  useEffect(() => {
    setPrevLineIdx(displayLineIdx);
    if (transition === 'none' || !lineMode) {
      setDisplayLineIdx(lineIndex);
      setExitingLineIdx(null);
      setEnteringLineIdx(null);
      return;
    }
    if (lineTransTimerRef.current) clearTimeout(lineTransTimerRef.current);
    setExitingLineIdx(displayLineIdx);
    setEnteringLineIdx(lineIndex);
    lineTransTimerRef.current = setTimeout(() => {
      setDisplayLineIdx(lineIndex);
      setExitingLineIdx(null);
      setEnteringLineIdx(null);
    }, 1000);
  }, [lineIndex]);

  // When transition type changes, clear any in-progress transitions
  useEffect(() => {
    setExitingLineIdx(null);
    setEnteringLineIdx(null);
    setDisplayLineIdx(lineIndex);
    setExitingIdx(null);
    setEnteringIdx(null);
    setDisplayIdx(index);
  }, [transition]);

  // Fullscreen — auto-enter only for inline mode; display window uses the manual button
  useEffect(() => {
    if (!display) document.documentElement.requestFullscreen?.().catch(() => {});
    const onFsChange = () => {
      if (!display && !document.fullscreenElement) onClose();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      if (!display && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose, display]);

  // BroadcastChannel — keep slide in sync across controller + display windows
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isSlideRemote = useRef(false);
  const isFontRemote = useRef(false);
  const isSlideThemeRemote = useRef(false);
  // Skip the initial effect run — the initial value is synced via the ready/ping handshake,
  // not by broadcasting. Without this, the display window's mount-time broadcast poisons the
  // presenter's isSlideRemote flag, causing the first user navigation to be silently dropped.
  const slideEffectInitialized = useRef(false);
  const fontEffectInitialized = useRef(false);
  useEffect(() => {
    const BC = (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    if (!BC) return;
    const ch = new BC('projector');
    ch.onmessage = (e) => {
      if (e.data.type === 'slide') {
        isSlideRemote.current = true;
        setIndex(e.data.index);
      } else if (e.data.type === 'fontScale') {
        isFontRemote.current = true;
        setFontScale(e.data.value);
      } else if (e.data.type === 'requestFullscreen') {
        setPendingFullscreen(true);
      } else if (e.data.type === 'slideTheme') {
        isSlideThemeRemote.current = true;
        setSlideTheme(e.data.value);
      } else if (e.data.type === 'lineMode') {
        setLineMode(e.data.active);
      } else if (e.data.type === 'lineIndex') {
        setLineIndex(e.data.index);
      } else if (e.data.type === 'linesPerSlide') {
        setLinesPerSlide(e.data.value);
      } else if (e.data.type === 'transition') {
        setTransition(e.data.value);
      } else if (e.data.type === 'showTranslation') {
        setShowTranslation(e.data.value);
      } else if (e.data.type === 'showPartLabel') {
        setShowPartLabel(e.data.value);
      } else if (e.data.type === 'blank') {
        setBlank(e.data.active);
      } else if (e.data.type === 'primaryLang') {
        setPrimaryLang(e.data.value);
      } else if (e.data.type === 'allCaps') {
        setAllCaps(e.data.value);
      } else if (e.data.type === 'ping') {
        // Presenter just mounted and is looking for the display — announce ready
        if (isDisplay) ch.postMessage({ type: 'ready' });
      }
    };
    channelRef.current = ch;
    if (isDisplay) {
      // Announce ready immediately; retry after 1500 ms in case presenter wasn't listening yet
      ch.postMessage({ type: 'ready' });
      const retry = setTimeout(() => ch.postMessage({ type: 'ready' }), 1500);
      return () => {
        ch.close();
        clearTimeout(retry);
      };
    }
    return () => ch.close();
  }, [isDisplay]);
  useEffect(() => {
    if (!slideEffectInitialized.current) {
      slideEffectInitialized.current = true;
      return;
    }
    if (isSlideRemote.current) {
      isSlideRemote.current = false;
      return;
    }
    channelRef.current?.postMessage({ type: 'slide', index });
  }, [index]);
  useEffect(() => {
    if (!fontEffectInitialized.current) {
      fontEffectInitialized.current = true;
      return;
    }
    if (isFontRemote.current) {
      isFontRemote.current = false;
      return;
    }
    channelRef.current?.postMessage({ type: 'fontScale', value: fontScale });
  }, [fontScale]);
  const slideThemeMounted = useRef(false);
  useEffect(() => {
    // Skip the mount broadcast — otherwise a freshly opened display window
    // announces its default and clobbers the presenter's choice.
    if (!slideThemeMounted.current) {
      slideThemeMounted.current = true;
      return;
    }
    if (isSlideThemeRemote.current) {
      isSlideThemeRemote.current = false;
      return;
    }
    channelRef.current?.postMessage({ type: 'slideTheme', value: slideTheme });
  }, [slideTheme]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      else if (e.key === 'f') openFullscreen();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  // Auto-hide chrome after 3s of inactivity. Only mouse movement and taps
  // reveal the bars — arrow keys and swipes are navigation gestures, not UI
  // intent, so they leave the chrome hidden. Display windows are unaffected.
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetIdle = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 3000);
  }, []);
  useEffect(() => {
    if (display) return;
    resetIdle();
    window.addEventListener('mousemove', resetIdle);
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [display, resetIdle]);

  // Touch swipe (≥50px navigates); a short tap (<10px) reveals the chrome
  useEffect(() => {
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) next();
        else prev();
      } else if (Math.abs(dx) < 10) {
        resetIdle();
      }
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [next, prev, resetIdle]);

  const effectiveIdx = displayIdx;
  const isTitleSlide = effectiveIdx === 0;
  const isAmenSlide = effectiveIdx === total - 1;
  const isPartSlide = !isTitleSlide && !isAmenSlide;
  // Precompute verse numbers for the expanded parts list
  let verseCount = 0;
  const verseNumbers = parts.map((p) => {
    if (p.type === 'verse') return ++verseCount;
    return null;
  });

  const counterLabel = isPartSlide ? `${index} / ${parts.length}` : '—';

  // Helper: render a slide transition exit layer
  function renderSlideLayer(idx: number, phase: 'exit' | 'enter') {
    const iTitle = idx === 0;
    const iAmen = idx === total - 1;
    const iPart = !iTitle && !iAmen;
    const p = iPart ? parts[idx - 1] : null;
    const ls = p ? p.lyrics.split('\n') : [];
    return (
      <div
        key={`${phase}-${idx}`}
        className={`projector__content-layer projector__content-layer--${phase} proj-trans--${transition}-${phase}`}
      >
        {iTitle ? (
          <div className="projector__title-slide">
            <div className="projector__title-name">{song.title}</div>
          </div>
        ) : !iAmen ? (
          <div className="projector__lyrics">
            {ls.map((line, i) => (
              <ChordLine key={i} line={line} showChords={false} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!mounted) return null;

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setPendingFullscreen(false);
  }

  const isTransitioningLine = exitingLineIdx !== null || enteringLineIdx !== null;
  const isTransitioningSlide = exitingIdx !== null || enteringIdx !== null;
  // For the entering/idle slide layer, render the target index (not the old displayIdx)
  const renderSlideIdx = isTransitioningSlide && enteringIdx !== null ? enteringIdx : effectiveIdx;
  const renderIsTitleSlide = renderSlideIdx === 0;
  const renderIsAmenSlide = renderSlideIdx === total - 1;
  const renderPart = !renderIsTitleSlide && !renderIsAmenSlide ? parts[renderSlideIdx - 1] : null;
  const renderLines = renderPart ? renderPart.lyrics.split('\n') : [];
  // During a line transition the entering layer must show the NEW line, not the old display index
  const activeLineIdx = isTransitioningLine && enteringLineIdx !== null ? enteringLineIdx : displayLineIdx;
  const rawCurrentSlide = lineSlides[activeLineIdx];
  const currentLineSlide =
    primaryLang && rawCurrentSlide ? swapPrimaryLang(rawCurrentSlide, primaryLang) : rawCurrentSlide;

  // linesPerSlide=2: show current + next preview below (no prev); linesPerSlide=1: current only
  const showNextLine = linesPerSlide === 2 && !isTransitioningLine && activeLineIdx < lineSlides.length - 1;

  // Background symbol for line mode — large dim number/abbreviation, same style as slide mode
  const lineBgInfo = (() => {
    if (!currentLineSlide) return null;
    const { partType, partIndex } = currentLineSlide;
    if (partType === 'chorus') return { symbol: chorusLabel(song.songbook.language), isWord: true, isRef: true };
    if (partType === 'verse') {
      const seen = new Set<number>();
      let vCount = 0;
      for (const ls of lineSlides) {
        if (!seen.has(ls.partIndex)) {
          seen.add(ls.partIndex);
          if (ls.partType === 'verse') vCount++;
          if (ls.partIndex === partIndex) break;
        }
      }
      return vCount > 0 ? { symbol: String(vCount), isWord: false, isRef: false } : null;
    }
    return null;
  })();

  return createPortal(
    <div className={`projector${idle && !display ? ' projector--idle' : ''}`} data-slide-theme={slideTheme}>
      {/* Blank screen overlay — solid black, hides all content */}
      {blank && <div className="projector__blank-overlay" aria-hidden="true" />}

      {/* Fullscreen request overlay — requires a user gesture on this window */}
      {pendingFullscreen && (
        <button className="projector__fs-overlay" onClick={enterFullscreen} aria-label={t('enterFullscreen')}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t('enterFullscreen')}</span>
        </button>
      )}

      {/* Decorative background symbol — crossfades smoothly between slides */}
      {!lineMode && (
        <>
          {isTransitioningSlide && exitingIdx !== null && (
            <BgSymbol
              idx={exitingIdx}
              total={total}
              parts={parts}
              verseNumbers={verseNumbers}
              song={song}
              variant="out"
            />
          )}
          <BgSymbol
            idx={isTransitioningSlide && enteringIdx !== null ? enteringIdx : effectiveIdx}
            total={total}
            parts={parts}
            verseNumbers={verseNumbers}
            song={song}
            variant={isTransitioningSlide && enteringIdx !== null ? 'in' : undefined}
          />
        </>
      )}
      {/* Line mode background symbol — same visual style as slide mode */}
      {lineMode && showPartLabel && lineBgInfo && (
        <div
          className={[
            'projector__bg-symbol',
            lineBgInfo.isWord && 'projector__bg-symbol--word',
            lineBgInfo.isRef && 'projector__bg-symbol--ref',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden
        >
          {lineBgInfo.symbol}
        </div>
      )}

      {/* Top bar: logo | song title (part slides only) | send to screen | close */}
      <div className="projector__topbar">
        <div className="projector__logo" aria-hidden="true">
          SDARM<span className="projector__logo-accent">.life</span>
        </div>
        {isPartSlide && !lineMode && (
          <div className="projector__header">
            {song.number}. {song.title}
          </div>
        )}
        {display && isTitleSlide && !lineMode && (
          <button
            className="projector__close projector__screen-btn"
            onClick={() => openFullscreen()}
            aria-label={t('enterFullscreen')}
            title={t('enterFullscreen')}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
              <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button className="projector__close" onClick={onClose} aria-label={t('close')}>
          ✕
        </button>
      </div>

      {/* Main content area */}
      <div className="projector__content" style={{ fontSize: `${fontScale}em` }}>
        {lineMode && lineSlides.length > 0 ? (
          // Line-by-line mode: current (big) + optional next preview (dim, below)
          // linesPerSlide=1: just the current line; linesPerSlide=2: current + next below
          <div
            className={`projector__line-stage${linesPerSlide === 2 ? ' projector__line-stage--flow' : ' projector__line-stage--solo'}${allCaps ? ' projector__line-stage--caps' : ''}`}
          >
            {/* Persistent previous line — always dim above current in flow mode */}
            {linesPerSlide === 2 && !isTransitioningLine && prevLineIdx !== null && lineSlides[prevLineIdx] && (
              <div className="projector__line-layer projector__line-layer--prev" aria-hidden>
                <ChordLine line={lineSlides[prevLineIdx].line} showChords={false} />
              </div>
            )}

            {/* Exiting layer — old line exits upward */}
            {isTransitioningLine && exitingLineIdx !== null && lineSlides[exitingLineIdx] && (
              <div className={`projector__line-layer projector__line-layer--trans proj-trans--${transition}-exit`}>
                <LineContent
                  slide={
                    exitingLineIdx !== null && lineSlides[exitingLineIdx]
                      ? primaryLang
                        ? swapPrimaryLang(lineSlides[exitingLineIdx], primaryLang)
                        : lineSlides[exitingLineIdx]
                      : lineSlides[0]
                  }
                  phase="exit"
                  transition={transition}
                  showTranslation={showTranslation}
                />
              </div>
            )}

            {/* Current (idle) or entering layer — new line rises from below (in flow mode) */}
            {currentLineSlide && (
              <div
                className={`projector__line-layer projector__line-layer--current${
                  isTransitioningLine && enteringLineIdx !== null ? ` proj-trans--${transition}-enter` : ''
                }`}
              >
                <LineContent
                  slide={currentLineSlide}
                  phase={isTransitioningLine ? 'enter' : 'idle'}
                  transition={transition}
                  showTranslation={showTranslation}
                />
              </div>
            )}

            {/* Next preview — dim, smaller, below current (only in flow mode, no transition) */}
            {showNextLine && (
              <div key={activeLineIdx + 1} className="projector__line-layer projector__line-layer--next" aria-hidden>
                <ChordLine line={lineSlides[activeLineIdx + 1].line} showChords={false} />
              </div>
            )}
          </div>
        ) : (
          /* Part-slide mode */
          <div className="projector__slide-container">
            {/* Exiting slide layer */}
            {isTransitioningSlide && exitingIdx !== null && renderSlideLayer(exitingIdx, 'exit')}

            {/* Entering / idle slide layer — uses renderSlideIdx so new content is shown during enter */}
            <div
              className={`projector__content-layer${isTransitioningSlide && enteringIdx !== null ? ` projector__content-layer--enter proj-trans--${transition}-enter` : ''}`}
            >
              {renderIsTitleSlide ? (
                <div className="projector__title-slide">
                  <div className="projector__title-name">{song.title}</div>
                </div>
              ) : !renderIsAmenSlide ? (
                <div className="projector__lyrics">
                  {renderLines.map((line, i) => (
                    <ChordLine key={i} line={line} showChords={false} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar — only in non-display mode (display is fully controlled by PresenterDashboard) */}
      {!isDisplay && (
        <div className="projector__bottombar">
          <div className="projector__nav">
            <button className="projector__nav-btn" onClick={prev} disabled={index === 0} aria-label={t('previousPart')}>
              ‹
            </button>
            <span className="projector__counter">{counterLabel}</span>
            <button
              className="projector__nav-btn"
              onClick={next}
              disabled={index === total - 1}
              aria-label={t('nextPart')}
            >
              ›
            </button>
          </div>
          {!display && (
            <div className="projector__controls">
              <button
                className="projector__ctrl-btn"
                onClick={() => setSlideTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                title={slideTheme === 'dark' ? t('lightMode') : t('darkMode')}
              >
                {slideTheme === 'dark' ? '☀' : '☾'}
              </button>
              <button
                className="projector__ctrl-btn"
                onClick={() => setFontScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
                title={t('decreaseFont')}
              >
                A−
              </button>
              <button
                className="projector__ctrl-btn"
                onClick={() => setFontScale((s) => Math.min(2, +(s + 0.15).toFixed(2)))}
                title={t('increaseFont')}
              >
                A+
              </button>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
