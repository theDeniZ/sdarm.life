'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { SongDto, SongPartDto } from '@sdarm/types';
import { expandParts, getSiteTheme } from '@/app/lib/format';
import ChordLine from './ChordLine';

interface Props {
  song: SongDto;
  onClose: () => void;
}

interface SlideViewProps {
  song: SongDto;
  index: number;
  parts: SongPartDto[];
  verseNumbers: (number | null)[];
  partT: (key: string) => string;
  variant: 'current' | 'next';
  slideTheme: 'dark' | 'light';
}

function SlideView({ song, index, parts, verseNumbers, partT, variant, slideTheme }: SlideViewProps) {
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
    <div className={`pres-slide pres-slide--${variant}`} data-slide-theme={slideTheme}>
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

export default function PresenterDashboard({ song, onClose }: Props) {
  const t = useTranslations('songbook.presenter');
  const partT = useTranslations('songbook.partTypes');
  const parts = expandParts(song.parts);
  const total = parts.length + 2;

  const [index, setIndex] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [slideTheme, setSlideTheme] = useState<'dark' | 'light'>(getSiteTheme);
  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => setMounted(true), []);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  // Refs so the channel message handler always sees the latest values
  const indexRef = useRef(0);
  const fontScaleRef = useRef(1);
  const slideThemeRef = useRef<'dark' | 'light'>('dark');
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    fontScaleRef.current = fontScale;
  }, [fontScale]);
  useEffect(() => {
    slideThemeRef.current = slideTheme;
  }, [slideTheme]);

  // BroadcastChannel — keep in sync with the display window
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isSlideRemote = useRef(false);
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
      } else if (e.data.type === 'slide') {
        isSlideRemote.current = true;
        setIndex(e.data.index);
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
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

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

  const nextIndex = index + 1;
  const hasNext = nextIndex < total;

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
      <div className="presenter__slides">
        {/* Current slide */}
        <div className="presenter__panel presenter__panel--current">
          <div className="presenter__panel-label">{t('currentSlide')}</div>
          <SlideView
            song={song}
            index={index}
            parts={parts}
            verseNumbers={verseNumbers}
            partT={partT}
            variant="current"
            slideTheme={slideTheme}
          />
          <div className="presenter__slide-meta">{slideLabel}</div>
        </div>

        {/* Next slide */}
        <div className="presenter__panel presenter__panel--next">
          <div className="presenter__panel-label">{t('nextSlide')}</div>
          {hasNext ? (
            <SlideView
              song={song}
              index={nextIndex}
              parts={parts}
              verseNumbers={verseNumbers}
              partT={partT}
              variant="next"
              slideTheme={slideTheme}
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

      {/* Footer: navigation */}
      <div className="presenter__footer">
        <button className="presenter__nav-btn" onClick={prev} disabled={index === 0} aria-label={t('previous')}>
          ‹
        </button>
        <span className="presenter__counter">
          {index + 1} / {total}
        </span>
        <button className="presenter__nav-btn" onClick={next} disabled={index === total - 1} aria-label={t('next')}>
          ›
        </button>
      </div>
    </div>,
    document.body
  );
}
