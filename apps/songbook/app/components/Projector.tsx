'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SongDto } from '@sdarm/types';
import { partLabel, expandParts } from '@/app/lib/format';
import ChordLine from './ChordLine';

interface Props {
  song: SongDto;
  onClose: () => void;
}

export default function Projector({ song, onClose }: Props) {
  const parts = expandParts(song.parts);
  // index 0 = title slide; 1..parts.length = song parts
  const total = parts.length + 1;
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
  const part = isTitleSlide ? null : parts[index - 1];
  const lines = part ? part.lyrics.split('\n') : [];

  // Precompute verse numbers for the expanded parts list
  let verseCount = 0;
  const verseNumbers = parts.map((p) => {
    if (p.type === 'verse') return ++verseCount;
    return null;
  });

  const bgSymbol = (() => {
    if (isTitleSlide) return null;
    const partIndex = index - 1;
    if (part?.type === 'chorus') return 'Ref';
    const vn = verseNumbers[partIndex];
    return vn !== null ? String(vn) : null;
  })();

  return (
    <div className="projector">
      {!isTitleSlide && (
        <div className="projector__header">
          {song.number}. {song.title}
        </div>
      )}
      {!isTitleSlide && part && <div className="projector__part-label">{partLabel(part.type, part.label)}</div>}

      <button className="projector__close" onClick={onClose} aria-label="Close projector">
        ✕
      </button>

      {bgSymbol && (
        <div className="projector__bg-symbol" aria-hidden="true">
          {bgSymbol}
        </div>
      )}

      <div className="projector__content" style={{ fontSize: `${fontScale}em` }}>
        {isTitleSlide ? (
          <div className="projector__title-slide">
            <div className="projector__title-num">{song.number}</div>
            <div className="projector__title-name">{song.title}</div>
            {(song.author || song.copyright) && (
              <div className="projector__title-meta">{[song.author, song.copyright].filter(Boolean).join(' · ')}</div>
            )}
          </div>
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
        <span className="projector__counter">{isTitleSlide ? '—' : `${index} / ${parts.length}`}</span>
        <button className="projector__nav-btn" onClick={next} disabled={index === total - 1} aria-label="Next part">
          ›
        </button>
      </nav>

      <div className="projector__controls">
        <button
          className="projector__ctrl-btn"
          onClick={() => setFontScale((s) => Math.min(2, +(s + 0.15).toFixed(2)))}
          title="Increase font size"
        >
          A+
        </button>
        <button
          className="projector__ctrl-btn"
          onClick={() => setFontScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
          title="Decrease font size"
        >
          A−
        </button>
      </div>
    </div>
  );
}
