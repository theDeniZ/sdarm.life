'use client';

import { useState, useEffect, useCallback, useRef, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import type { SongDto, SongPartDto } from '@sdarm/types';
import { Wordmark } from '@sdarm/ui';
import { getSiteTheme } from '@/app/lib/format';
import type { LinePart, LineStep } from '@/app/lib/line-mode';
import { TRANSITION_SPEEDS, useLineMode, type LineMessage } from '@/app/lib/use-line-mode';
import ChordLine from './ChordLine';
import { LineText } from './LineStage';
import { amenLabel, chorusLabel } from './slide-labels';

interface Props {
  song: SongDto;
  onClose: () => void;
}

interface SlideViewProps {
  song: SongDto;
  index: number;
  parts: SongPartDto[];
  verseNumbers: (number | null)[];
  variant: 'current' | 'next';
  slideTheme: 'dark' | 'light';
  /** Line mode: the lines of this step instead of the whole part. */
  lineSlide?: { part: LinePart; step: LineStep } | null;
  blank?: boolean;
}

function SlideView({ song, index, parts, verseNumbers, variant, slideTheme, lineSlide, blank }: SlideViewProps) {
  const total = parts.length + 2;
  const isTitleSlide = index === 0;
  const isAmenSlide = index === total - 1;
  const isPartSlide = !isTitleSlide && !isAmenSlide;
  const part = isPartSlide ? parts[index - 1] : null;
  const lines = part ? part.lyrics.split('\n') : [];

  const bgSymbol = (() => {
    if (isTitleSlide) return String(song.number);
    if (isAmenSlide) return amenLabel(song.songbook.language);
    const partIndex = index - 1;
    if (part?.type === 'chorus') return chorusLabel(song.songbook.language);
    const vn = verseNumbers[partIndex];
    return vn !== null ? String(vn) : null;
  })();

  return (
    <div
      className={`pres-slide pres-slide--${variant}${blank ? ' pres-slide--blank' : ''}`}
      data-slide-theme={slideTheme}
    >
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
        ) : lineSlide ? (
          <div className="pres-slide__lyrics">
            <LineText
              lines={lineSlide.part.lines.slice(
                lineSlide.step.lineIndex,
                lineSlide.step.lineIndex + lineSlide.step.count
              )}
              subStyle={lineSlide.part.subStyle}
            />
          </div>
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

export default function PresenterDashboard({ song, onClose }: Props) {
  const t = useTranslations('songbook.presenter');
  const locale = useLocale();
  const partT = useTranslations('songbook.partTypes');
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const isSlideRemote = useRef(false);
  const post = useCallback((message: LineMessage) => channelRef.current?.postMessage(message), []);
  // See Projector: only a slide that actually changes may set the remote flag.
  const setIndexFromRemote = useCallback((i: number) => {
    if (indexRef.current === i) return false;
    indexRef.current = i;
    isSlideRemote.current = true;
    setIndex(i);
    return true;
  }, []);
  const line = useLineMode({ song, index, setIndex, setIndexFromRemote, post });
  const { resetLine, receive: receiveLine, blank, setBlank, setLineMode } = line;
  const lineSnapshot = useRef(line.snapshot);
  useEffect(() => {
    lineSnapshot.current = line.snapshot;
  }, [line.snapshot]);

  const parts = line.parts;
  const total = parts.length + 2;
  const [fontScale, setFontScale] = useState(1);
  const [slideTheme, setSlideTheme] = useState<'dark' | 'light'>(getSiteTheme);
  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => setMounted(true), []);

  const prevPart = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    resetLine();
  }, [resetLine]);
  const nextPart = useCallback(() => {
    setIndex((i) => Math.min(total - 1, i + 1));
    resetLine();
  }, [total, resetLine]);
  const prev = line.active ? line.prevStep : prevPart;
  const next = line.active ? line.nextStep : nextPart;

  // Refs so the channel message handler always sees the latest values
  const fontScaleRef = useRef(1);
  const slideThemeRef = useRef<'dark' | 'light'>('dark');
  useEffect(() => {
    fontScaleRef.current = fontScale;
  }, [fontScale]);
  useEffect(() => {
    slideThemeRef.current = slideTheme;
  }, [slideTheme]);

  // BroadcastChannel — keep in sync with the display window
  const isFontRemote = useRef(false);
  const isSlideThemeRemote = useRef(false);

  useEffect(() => {
    const BC = (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    if (!BC) return;
    const ch = new BC('projector');
    ch.onmessage = (e) => {
      if (e.data.type === 'ready') {
        // Display window finished loading — push current state so it syncs immediately
        setConnected(true);
        ch.postMessage({ type: 'slide', index: indexRef.current });
        ch.postMessage({ type: 'fontScale', value: fontScaleRef.current });
        ch.postMessage({ type: 'slideTheme', value: slideThemeRef.current });
        for (const message of lineSnapshot.current()) ch.postMessage(message);
      } else if (e.data.type === 'slide') {
        if (setIndexFromRemote(e.data.index)) resetLine();
      } else if (receiveLine(e.data)) {
        // line-by-line message, applied by useLineMode
      } else if (e.data.type === 'fontScale') {
        isFontRemote.current = true;
        setFontScale(e.data.value);
      } else if (e.data.type === 'slideTheme') {
        isSlideThemeRemote.current = true;
        setSlideTheme(e.data.value);
      }
    };
    channelRef.current = ch;
    return () => ch.close();
  }, [setIndexFromRemote, resetLine, receiveLine]);

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
    // Skip the mount broadcast — the display window's 'ready' handler pushes
    // the presenter's current theme; announcing the default here would race it.
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
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'b' || e.key === 'B') {
        setBlank(!blank);
      } else if (e.key === 'f' || e.key === 'F') {
        channelRef.current?.postMessage({ type: 'requestFullscreen' });
      } else if (e.key === '1' || e.key === '2') {
        setLineMode(true, e.key === '1' ? 1 : 2);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose, blank, setBlank, setLineMode]);

  // One-finger swipe on the slides advances on a tablet, as on the projector.
  const swipeStart = useRef<number | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    swipeStart.current = e.touches.length === 1 ? e.touches[0].clientX : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (swipeStart.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
  };

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

  // Line mode: "Verse 2 · line 3 / 5". The step decides the lines; the part's
  // own line count is the total.
  const step = line.steps[line.stepIndex];
  const linePart = line.active && isPartSlide ? line.lineParts[index - 1] : null;
  const lineLabel =
    linePart && step.count > 0
      ? step.count > 1
        ? t('lines', { from: step.lineIndex + 1, to: step.lineIndex + step.count, total: linePart.lines.length })
        : t('line', { from: step.lineIndex + 1, total: linePart.lines.length })
      : null;

  const nextIndex = index + 1;
  const hasNext = line.active ? line.stepIndex < line.steps.length - 1 : nextIndex < total;
  const nextStep = line.active ? line.steps[line.stepIndex + 1] : null;
  const nextSlideIndex = nextStep ? nextStep.partIndex : nextIndex;
  const nextLinePart = nextStep ? (line.lineParts[nextStep.partIndex - 1] ?? null) : null;
  const atStart = line.active ? line.stepIndex === 0 : index === 0;
  const atEnd = !hasNext;
  const counter = line.active ? `${line.stepIndex + 1} / ${line.steps.length}` : `${index + 1} / ${total}`;
  const langs = line.languages;

  if (!mounted) return null;

  return createPortal(
    <div className="presenter">
      {/* Header */}
      <div className="presenter__header">
        <Wordmark className="presenter__logo" />
        <div className="presenter__song-info">
          <span className="presenter__song-num">{song.number}.</span>
          {song.title}
        </div>
        <div className="presenter__header-right">
          <button
            className="presenter__ctrl-btn presenter__ctrl-btn--icon"
            onClick={() => channelRef.current?.postMessage({ type: 'requestFullscreen' })}
            title={t('fullscreen')}
            disabled={!connected}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="presenter__header-divider" />
          <button
            className="presenter__ctrl-btn presenter__ctrl-btn--icon"
            onClick={() => setSlideTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            title={slideTheme === 'dark' ? t('lightMode') : t('darkMode')}
          >
            {slideTheme === 'dark' ? '☀' : '☾'}
          </button>
          <div className="presenter__header-divider" />
          <button
            className="presenter__ctrl-btn"
            onClick={() => setFontScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
            title={t('decreaseFont')}
          >
            A−
          </button>
          <span className="presenter__font-scale">{Math.round(fontScale * 100)}%</span>
          <button
            className="presenter__ctrl-btn"
            onClick={() => setFontScale((s) => Math.min(2, +(s + 0.15).toFixed(2)))}
            title={t('increaseFont')}
          >
            A+
          </button>
          <button className="presenter__close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>
      </div>

      {/* Slides area */}
      <div className="presenter__slides" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Current slide */}
        <div className="presenter__panel presenter__panel--current">
          <div className="presenter__panel-label">
            {t('currentSlide')}
            {blank && <span className="presenter__panel-flag">{t('blank')}</span>}
          </div>
          <SlideView
            song={song}
            index={index}
            parts={parts}
            verseNumbers={verseNumbers}
            variant="current"
            slideTheme={slideTheme}
            lineSlide={linePart ? { part: linePart, step } : null}
            blank={blank}
          />
          <div className="presenter__slide-meta">
            {slideLabel}
            {lineLabel && ` · ${lineLabel}`}
          </div>
        </div>

        {/* Next slide */}
        <div className="presenter__panel presenter__panel--next">
          <div className="presenter__panel-label">{t('nextSlide')}</div>
          {hasNext ? (
            <SlideView
              song={song}
              index={nextSlideIndex}
              parts={parts}
              verseNumbers={verseNumbers}
              variant="next"
              slideTheme={slideTheme}
              lineSlide={nextStep && nextLinePart ? { part: nextLinePart, step: nextStep } : null}
            />
          ) : (
            <div className="pres-slide pres-slide--next pres-slide--end" data-slide-theme={slideTheme}>
              <span>{t('endOfSong')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Connecting overlay — shown until display window is ready */}
      {!connected && (
        <div className="presenter__connecting" aria-live="polite">
          <div className="presenter__connecting-inner">
            <div className="presenter__connecting-dots">
              <span />
              <span />
              <span />
            </div>
            <p className="presenter__connecting-text">Connecting to display…</p>
          </div>
        </div>
      )}

      {/* Line-by-line controls. Everything here is also on the keyboard:
          1 / 2 lines, B blank, F fullscreen on the display. */}
      <div className="presenter__toolbar">
        <div className="presenter__group">
          <button
            className={`presenter__pill${line.active ? ' is-active' : ''}`}
            onClick={() => setLineMode(!line.active)}
            aria-pressed={line.active}
          >
            {t('lineMode')}
          </button>
          <span className="presenter__group-label">{t('linesPerSlide')}</span>
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              className={`presenter__pill presenter__pill--square${line.active && line.linesPerSlide === n ? ' is-active' : ''}`}
              onClick={() => setLineMode(true, n)}
              aria-pressed={line.active && line.linesPerSlide === n}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="presenter__group">
          <span className="presenter__group-label">{t('transition')}</span>
          {(['slide', 'fade'] as const).map((style) => (
            <button
              key={style}
              className={`presenter__pill${line.transition.style === style ? ' is-active' : ''}`}
              onClick={() => line.setTransition({ ...line.transition, style })}
              aria-pressed={line.transition.style === style}
            >
              {t(style === 'slide' ? 'transitionSlide' : 'transitionFade')}
            </button>
          ))}
          {TRANSITION_SPEEDS.map((ms) => (
            <button
              key={ms}
              className={`presenter__pill${line.transition.durationMs === ms ? ' is-active' : ''}`}
              onClick={() => line.setTransition({ ...line.transition, durationMs: ms })}
              aria-pressed={line.transition.durationMs === ms}
              title={t('transitionSpeed')}
            >
              {(ms / 1000).toLocaleString(locale)} s
            </button>
          ))}
        </div>

        {langs.length > 1 && (
          <div className="presenter__group">
            <span className="presenter__group-label">{t('primaryLanguage')}</span>
            {langs.map((lang) => (
              <button
                key={lang}
                className={`presenter__pill${line.primaryLang === lang ? ' is-active' : ''}`}
                onClick={() =>
                  line.setLanguages(lang, line.secondaryLang === lang ? line.primaryLang : line.secondaryLang)
                }
                aria-pressed={line.primaryLang === lang}
              >
                {lang.toUpperCase()}
              </button>
            ))}
            <button
              className="presenter__pill presenter__pill--square"
              onClick={line.swapLanguages}
              disabled={!line.secondaryLang}
              title={t('swapLanguages')}
              aria-label={t('swapLanguages')}
            >
              ⇄
            </button>
            <span className="presenter__group-label">{t('translation')}</span>
            {[null, ...langs.filter((l) => l !== line.primaryLang)].map((lang) => (
              <button
                key={lang ?? 'none'}
                className={`presenter__pill${line.secondaryLang === lang ? ' is-active' : ''}`}
                onClick={() => line.setLanguages(line.primaryLang, lang)}
                aria-pressed={line.secondaryLang === lang}
              >
                {lang ? lang.toUpperCase() : t('translationOff')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer: navigation */}
      <div className="presenter__footer">
        <button className="presenter__nav-btn" onClick={prev} disabled={atStart} aria-label={t('previous')}>
          ‹
        </button>
        <span className="presenter__counter">{counter}</span>
        <button className="presenter__nav-btn" onClick={next} disabled={atEnd} aria-label={t('next')}>
          ›
        </button>
        <button
          className={`presenter__pill presenter__blank${blank ? ' is-active' : ''}`}
          onClick={() => setBlank(!blank)}
          aria-pressed={blank}
          title={t('blankTitle')}
        >
          {t('blank')}
        </button>
      </div>
    </div>,
    document.body
  );
}
