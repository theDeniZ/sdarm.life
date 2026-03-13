'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SongDto } from '@sdarm/types';
import { partLabel } from '@/app/lib/format';
import ChordLine from './ChordLine';

interface Props {
  song: SongDto;
  onClose: () => void;
}

export default function Projector({ song, onClose }: Props) {
  const parts = song.parts;
  const [index, setIndex] = useState(0);
  const [showChords, setShowChords] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(parts.length - 1, i + 1)), [parts.length]);

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

  const part = parts[index];
  const lines = part ? part.lyrics.split('\n') : [];

  return (
    <div className="projector">
      <div className="projector__header">
        {song.number}. {song.title}
      </div>
      {part && <div className="projector__part-label">{partLabel(part.type, part.label)}</div>}

      <button className="projector__close" onClick={onClose} aria-label="Close projector">
        ✕
      </button>

      <div className="projector__content" style={{ fontSize: `${fontScale}em` }}>
        <div className="projector__lyrics">
          {lines.map((line, i) => (
            <ChordLine key={i} line={line} showChords={showChords} />
          ))}
        </div>
      </div>

      <nav className="projector__nav">
        <button className="projector__nav-btn" onClick={prev} disabled={index === 0} aria-label="Previous part">
          ‹
        </button>
        <span className="projector__counter">
          {index + 1} / {parts.length}
        </span>
        <button
          className="projector__nav-btn"
          onClick={next}
          disabled={index === parts.length - 1}
          aria-label="Next part"
        >
          ›
        </button>
      </nav>

      <div className="projector__controls">
        <button
          className={`projector__ctrl-btn${showChords ? ' on' : ''}`}
          onClick={() => setShowChords((v) => !v)}
          title="Toggle chord display"
        >
          Chords
        </button>
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
