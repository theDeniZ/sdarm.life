'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { SongDto } from '@sdarm/types';
import { expandParts, getSiteTheme } from '@/app/lib/format';
import ChordLine from './ChordLine';
import { amenLabel, chorusLabel } from './slide-labels';

interface Props {
  song: SongDto;
  onClose: () => void;
  isDisplay?: boolean;
}

// One place for the bounds: the A−/A+ buttons and the pinch gesture must agree,
// or a pinch could take the scale somewhere the buttons cannot bring it back from.
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const clampScale = (v: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(v.toFixed(2))));

const pinchDistance = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

export default function Projector({ song, onClose, isDisplay }: Props) {
  const t = useTranslations('songbook.projector');
  const parts = expandParts(song.parts);
  // index 0 = title slide; 1..parts.length = song parts; parts.length+1 = amen slide
  const total = parts.length + 2;
  const [index, setIndex] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  // The pinch handler cannot read fontScale from the closure — it would need to
  // be a dependency, and re-registering listeners mid-gesture drops the pinch.
  const fontScaleRef = useRef(fontScale);
  useEffect(() => {
    fontScaleRef.current = fontScale;
  }, [fontScale]);
  const [slideTheme, setSlideTheme] = useState<'dark' | 'light'>(getSiteTheme);
  const [mounted, setMounted] = useState(false);
  const [display, setDisplay] = useState(isDisplay);
  const [pendingFullscreen, setPendingFullscreen] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);
  const openFullscreen = useCallback(() => {
    setDisplay(false);
  }, []);

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
      }
    };
    channelRef.current = ch;
    // Announce to the presenter that the display window is ready
    if (isDisplay) ch.postMessage({ type: 'ready' });
    return () => ch.close();
  }, [isDisplay]);
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
  const slideThemeMounted = useRef(false);
  useEffect(() => {
    // Skip the mount broadcast — otherwise a freshly opened display window
    // announces its default 'dark' and clobbers the presenter's choice.
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

  // Touch. One finger swipes between slides (≥50px navigates, <10px is a tap that
  // reveals the chrome); two fingers pinch the lyrics larger or smaller, so on a
  // tablet nobody has to find the A−/A+ buttons.
  //
  // Both gestures live in one effect because they overlap: when a pinch ends the
  // fingers lift one at a time, and the swipe test would read that last movement
  // as a page turn. `pinching` is what keeps a resize from also changing slide.
  useEffect(() => {
    let startX = 0;
    let pinchStart = 0;
    let pinchScale = 1;
    let pinching = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinching = true;
        pinchStart = pinchDistance(e.touches);
        pinchScale = fontScaleRef.current;
      } else if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2 || pinchStart === 0) return;
      // Registered with passive: false so this is allowed — without it the
      // browser zooms its own page instead and the slide never changes size.
      e.preventDefault();
      setFontScale(clampScale(pinchScale * (pinchDistance(e.touches) / pinchStart)));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (pinching) {
        if (e.touches.length === 0) pinching = false;
        return;
      }
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) next();
        else prev();
      } else if (Math.abs(dx) < 10) {
        resetIdle();
      }
    };

    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [next, prev, resetIdle]);

  const isTitleSlide = index === 0;
  const isAmenSlide = index === total - 1;
  const isPartSlide = !isTitleSlide && !isAmenSlide;
  const part = isPartSlide ? parts[index - 1] : null;
  const lines = part ? part.lyrics.split('\n') : [];

  // Precompute verse numbers for the expanded parts list
  let verseCount = 0;
  const verseNumbers = parts.map((p) => {
    if (p.type === 'verse') return ++verseCount;
    return null;
  });

  const bgSymbol = (() => {
    if (isTitleSlide) return String(song.number);
    if (isAmenSlide) return amenLabel(song.songbook.language);
    const partIndex = index - 1;
    if (part?.type === 'chorus') return chorusLabel(song.songbook.language);
    const vn = verseNumbers[partIndex];
    return vn !== null ? String(vn) : null;
  })();

  // "Припев" / "Amen" are words; a verse mark and the song number are numerals.
  const isWordSymbol = isAmenSlide || part?.type === 'chorus';

  const counterLabel = isPartSlide ? `${index} / ${parts.length}` : '—';

  if (!mounted) return null;

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setPendingFullscreen(false);
  }

  return createPortal(
    <div className={`projector${idle && !display ? ' projector--idle' : ''}`} data-slide-theme={slideTheme}>
      {/* Fullscreen request overlay — requires a user gesture on this window */}
      {pendingFullscreen && (
        <button className="projector__fs-overlay" onClick={enterFullscreen} aria-label={t('enterFullscreen')}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t('enterFullscreen')}</span>
        </button>
      )}

      {/* Decorative background symbol — position:absolute, pointer-events:none.
          Numerals sit on the golden section, words centre: see the CSS. */}
      {bgSymbol && (
        <div
          className={[
            'projector__bg-symbol',
            isWordSymbol || isTitleSlide ? 'projector__bg-symbol--center' : '',
            isWordSymbol ? 'projector__bg-symbol--word' : '',
            part?.type === 'chorus' ? 'projector__bg-symbol--ref' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          {bgSymbol}
        </div>
      )}

      {/* Top bar: logo | song title (part slides only) | send to screen | close */}
      <div className="projector__topbar">
        <div className="projector__logo" aria-hidden="true">
          SDARM<span className="projector__logo-accent">.life</span>
        </div>
        {isPartSlide && (
          <div className="projector__header">
            {song.number}. {song.title}
          </div>
        )}
        {display && isTitleSlide && (
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
        {isTitleSlide ? (
          <div className="projector__title-slide">
            <div className="projector__title-name">{song.title}</div>
          </div>
        ) : !isAmenSlide ? (
          <div className="projector__lyrics">
            {lines.map((line, i) => (
              <ChordLine key={i} line={line} showChords={false} />
            ))}
          </div>
        ) : null}
      </div>

      {/* Bottom bar: nav (centered) + font controls (right) */}
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
              onClick={() => setFontScale((s) => clampScale(s - 0.15))}
              title={t('decreaseFont')}
            >
              A−
            </button>
            <button
              className="projector__ctrl-btn"
              onClick={() => setFontScale((s) => clampScale(s + 0.15))}
              title={t('increaseFont')}
            >
              A+
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
