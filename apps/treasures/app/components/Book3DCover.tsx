'use client';

import type { CSSProperties } from 'react';

interface Props {
  src: string | null;
  alt: string;
  title?: string;
  accentColor?: string | null;
  gradient?: string | null;
}

// Museum-tone fallback palettes for treasures that have no cover image yet.
// Pick is deterministic from the title so a book keeps the same colour
// between renders and across breakpoints.
const FALLBACK_HUES: { skin: string; spine: string }[] = [
  { skin: 'linear-gradient(140deg, #3a2418, #1c100a)', spine: '#6b4a32' },
  { skin: 'linear-gradient(140deg, #3a2d18, #1c180a)', spine: '#7a5e2e' },
  { skin: 'linear-gradient(140deg, #2a1830, #14081c)', spine: '#5a3a6b' },
  { skin: 'linear-gradient(140deg, #1c2a30, #0a141c)', spine: '#2e5a6b' },
  { skin: 'linear-gradient(140deg, #2a3018, #141c0a)', spine: '#5a6b2e' },
  { skin: 'linear-gradient(140deg, #301818, #1c0a0a)', spine: '#6b2e2e' },
];

// Approximate page counts for known EGW titles (any language edition).
// Depth is scaled from page count: ~100 pages → 20px, ~800 pages → 46px.
// Unknown titles fall back to a hash-based value in the moderate range.
const BOOK_PAGES: Record<string, number> = {
  // German
  'Der Weg zu Christus': 96,
  'Das Leben Jesu': 835,
  'Der große Kampf': 678,
  'Propheten und Könige': 741,
  'Patriarchen und Propheten': 793,
  'Das Wirken der Apostel': 601,
  'Auf den Spuren des großen Arztes': 541,
  'Gedanken vom Berg der Seligpreisungen': 175,
  // English
  'Steps to Christ': 96,
  'The Desire of Ages': 835,
  'The Great Controversy': 678,
  'Prophets and Kings': 741,
  'Patriarchs and Prophets': 793,
  'The Acts of the Apostles': 601,
  'The Ministry of Healing': 541,
  "Christ's Object Lessons": 418,
  'Thoughts from the Mount of Blessing': 175,
  Education: 309,
  // Russian
  'Желание веков': 835,
  'Великая Борьба': 678,
  'Великая борьба (новое изд.)': 678,
  'Пророки и цари': 741,
  'Патриархи и пророки': 793,
  'Деяния апостолов': 601,
  'Служение исцеления': 541,
  'Путь ко Христу': 96,
  'Нагорная проповедь Христа': 175,
};

function hash(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

function pickHue(title: string): { skin: string; spine: string } {
  return FALLBACK_HUES[hash(title) % FALLBACK_HUES.length];
}

function pagesToDepth(pages: number): number {
  // 96 pages → 12px, 835 pages → 24px — linear, clamped
  return Math.round(Math.max(12, Math.min(24, 12 + ((pages - 96) / (835 - 96)) * 12)));
}

function pickDepth(title: string): number {
  if (!title) return 18;
  const known = BOOK_PAGES[title];
  if (known) return pagesToDepth(known);
  // Unknown book: moderate range 14–20px via hash
  return 14 + (hash(title) % 7);
}

export default function Book3DCover({ src, alt, title = '', accentColor, gradient }: Props) {
  const hue = pickHue(title);
  const depth = pickDepth(title);
  const style = {
    ['--tome-spine' as never]: accentColor ?? hue.spine,
    ['--tome-skin' as never]: gradient ?? hue.skin,
    ['--tome-depth' as never]: `${depth}px`,
  } as CSSProperties;

  return (
    <figure className="tome" style={style}>
      <div className="tome-stack">
        <span className="tome-edge" aria-hidden="true" />
        <span className="tome-bind" aria-hidden="true" />
        {src ? (
          <img className="tome-face" src={src} alt={alt} loading="lazy" />
        ) : (
          <div className="tome-face tome-face--blank">
            <span className="tome-mark" aria-hidden="true">
              ✦
            </span>
            {title && <span className="tome-name">{title}</span>}
          </div>
        )}
      </div>
    </figure>
  );
}
