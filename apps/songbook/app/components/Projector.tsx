'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SongDto } from '@sdarm/types';
import { expandParts } from '@/app/lib/format';
import ChordLine from './ChordLine';

interface Props {
  song: SongDto;
  onClose: () => void;
}

export default function Projector({ song, onClose }: Props) {
  const parts = expandParts(song.parts);
  // index 0 = title slide; 1..parts.length = song parts; parts.length+1 = amen slide
  const total = parts.length + 2;
  const [index, setIndex] = useState(0);
  const [fontScale, setFontScale] = useState(1);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

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

  // BG symbol: null for amen slide (Amen is shown as foreground content)
  const bgSymbol = (() => {
    if (isTitleSlide) return String(song.number);
    if (isAmenSlide) return null;
    const partIndex = index - 1;
    if (part?.type === 'chorus') return 'Ref';
    const vn = verseNumbers[partIndex];
    return vn !== null ? String(vn) : null;
  })();

  const counterLabel = isPartSlide ? `${index} / ${parts.length}` : '—';

  return (
    <div className="projector">
      {/* Logo top-left */}
      <div className="projector__logo" aria-hidden="true">
        SDARM<span className="projector__logo-accent">.life</span>
      </div>

      {/* Song name centered top during part slides (not italic, no letter-spacing) */}
      {isPartSlide && (
        <div className="projector__header">
          {song.number}. {song.title}
        </div>
      )}

      <button className="projector__close" onClick={onClose} aria-label="Close projector">
        ✕
      </button>

      {bgSymbol && (
        <div
          className={`projector__bg-symbol${isTitleSlide ? ' projector__bg-symbol--center projector__bg-symbol--upright' : ''}`}
          aria-hidden="true"
        >
          {bgSymbol}
        </div>
      )}

      <div className="projector__content" style={{ fontSize: `${fontScale}em` }}>
        {isTitleSlide ? (
          <div className="projector__title-slide">
            <div className="projector__title-name">{song.title}</div>
            {(song.author || song.copyright) && (
              <div className="projector__title-meta">{[song.author, song.copyright].filter(Boolean).join(' · ')}</div>
            )}
          </div>
        ) : isAmenSlide ? (
          <div className="projector__amen-slide">Amen</div>
        ) : (
          <div className="projector__lyrics">
            {lines.map((line, i) => (
              <ChordLine key={i} line={line} showChords={false} />
            ))}
          </div>
        )}
      </div>

      <nav className="projector__nav">
        <button className="projector__nav-btn" onClick={prev} disabled={index === 0} aria-label="Previous part">
          ‹
        </button>
        <span className="projector__counter">{counterLabel}</span>
        <button className="projector__nav-btn" onClick={next} disabled={index === total - 1} aria-label="Next part">
          ›
        </button>
      </nav>

      <div className="projector__controls">
        <button
          className="projector__ctrl-btn"
          onClick={() => setFontScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
          title="Decrease font size"
        >
          A−
        </button>
        <button
          className="projector__ctrl-btn"
          onClick={() => setFontScale((s) => Math.min(2, +(s + 0.15).toFixed(2)))}
          title="Increase font size"
        >
          A+
        </button>
      </div>
    </div>
  );
}
