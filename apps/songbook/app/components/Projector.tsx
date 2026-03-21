'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations, useLocale } from 'next-intl';
import type { SongDto } from '@sdarm/types';
import { expandParts } from '@/app/lib/format';
import ChordLine from './ChordLine';

interface Props {
  song: SongDto;
  onClose: () => void;
  isDisplay?: boolean;
}

export default function Projector({ song, onClose, isDisplay }: Props) {
  const t = useTranslations('songbook.projector');
  const locale = useLocale();
  const partT = useTranslations('songbook.partTypes');
  const parts = expandParts(song.parts);
  // index 0 = title slide; 1..parts.length = song parts; parts.length+1 = amen slide
  const total = parts.length + 2;
  const [index, setIndex] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [multiScreen, setMultiScreen] = useState(false);
  useEffect(() => {
    setMounted(true);
    setMultiScreen(!!(window.screen as Screen & { isExtended?: boolean }).isExtended);
  }, []);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  // Fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    const onFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose]);

  // BroadcastChannel — keep slide in sync across controller + display windows
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isRemote = useRef(false);
  useEffect(() => {
    const ch = new BroadcastChannel('projector');
    ch.onmessage = (e) => {
      if (e.data.type === 'slide') {
        isRemote.current = true;
        setIndex(e.data.index);
      }
    };
    channelRef.current = ch;
    return () => ch.close();
  }, []);
  useEffect(() => {
    if (isRemote.current) {
      isRemote.current = false;
      return;
    }
    channelRef.current?.postMessage({ type: 'slide', index });
  }, [index]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  // Touch swipe
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
      }
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [next, prev]);

  // Open projector on an external screen
  async function openOnScreen() {
    let features = `width=${screen.availWidth},height=${screen.availHeight},left=${(screen as Screen & { availLeft?: number }).availLeft ?? 0},top=${(screen as Screen & { availTop?: number }).availTop ?? 0}`;
    try {
      // Window Management API — Chrome 111+, requires "window-management" permission
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
      // API unavailable or permission denied — fall back to current screen dimensions
    }
    window.open(`/${locale}/songbooks/${song.songbook.slug}/${song.id}?projector=1`, 'projector-display', features);
  }

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
    if (isAmenSlide) return 'Amen';
    const partIndex = index - 1;
    if (part?.type === 'chorus') return partT('chorus').slice(0, 3);
    const vn = verseNumbers[partIndex];
    return vn !== null ? String(vn) : null;
  })();

  const counterLabel = isPartSlide ? `${index} / ${parts.length}` : '—';

  if (!mounted) return null;

  return createPortal(
    <div className="projector">
      {/* Decorative background symbol — position:absolute, pointer-events:none */}
      {bgSymbol && (
        <div
          className={`projector__bg-symbol${isTitleSlide || isAmenSlide ? ' projector__bg-symbol--center' : ''}${part?.type === 'chorus' ? ' projector__bg-symbol--word projector__bg-symbol--ref' : ''}${isAmenSlide ? ' projector__bg-symbol--word' : ''}`}
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
        {!isDisplay && multiScreen && (
          <button
            className="projector__close projector__screen-btn"
            onClick={openOnScreen}
            aria-label={t('openExternal')}
            title={t('openExternal')}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
              <rect x="2" y="3" width="16" height="11" rx="1.5" />
              <line x1="7" y1="17" x2="13" y2="17" />
              <line x1="10" y1="14" x2="10" y2="17" />
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
        <div className="projector__controls">
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
      </div>
    </div>,
    document.body
  );
}
