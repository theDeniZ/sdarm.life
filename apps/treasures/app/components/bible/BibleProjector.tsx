'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { BibleChapter, ParallelChapter } from '../../lib/bible';

interface Props {
  chapter: BibleChapter;
  /** When set, render two translations side-by-side aligned by verse number. */
  parallel?: ParallelChapter | null;
  onClose: () => void;
  isDisplay?: boolean;
}

type Selection = ReadonlySet<number>;

const CHANNEL = 'bible-projector';

export default function BibleProjector({ chapter, parallel, onClose, isDisplay }: Props) {
  const t = useTranslations('treasures.bible');
  // In parallel mode the verse list is the union of both translations (already
  // produced by the API), each row carrying optional `a` and `b` text. In
  // single mode we just iterate the chapter verses.
  const isParallel = !!parallel;
  const parallelVerses = parallel?.verses ?? [];
  const verses = chapter.verses;
  const firstVerse = isParallel ? (parallelVerses[0]?.verse ?? 1) : (verses[0]?.verse ?? 1);

  const [selection, setSelection] = useState<Selection>(() => new Set([firstVerse]));
  const [fontScale, setFontScale] = useState(1);
  const [blank, setBlank] = useState(false);
  const [mounted] = useState(() => typeof window !== 'undefined');
  const [pendingFullscreen, setPendingFullscreen] = useState(false);

  // Reset selection when the chapter prop changes (operator picked a new passage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection(new Set([firstVerse]));
  }, [chapter.book.code, chapter.chapter, firstVerse]);

  // Auto-enter fullscreen for inline (single-screen) mode; the display window
  // requires a user gesture (tap) and uses the manual overlay below.
  useEffect(() => {
    if (!isDisplay) document.documentElement.requestFullscreen?.().catch(() => {});
    const onFsChange = () => {
      if (!isDisplay && !document.fullscreenElement) onClose();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      if (!isDisplay && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose, isDisplay]);

  // BroadcastChannel — receive selection / fontScale / blank / passage from operator.
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e) => {
      if (e.data.type === 'selection') {
        setSelection(new Set<number>(e.data.verses));
      } else if (e.data.type === 'fontScale') {
        setFontScale(e.data.value);
      } else if (e.data.type === 'blank') {
        setBlank(!!e.data.on);
      } else if (e.data.type === 'requestFullscreen') {
        setPendingFullscreen(true);
      } else if (e.data.type === 'passage' && isDisplay) {
        // Operator picked a new chapter (and optionally a parallel translation)
        // — navigate this window to it. `?projector=1` keeps display mode;
        // `?compare=` toggles parallel rendering on the projector page.
        const params = new URLSearchParams();
        params.set('projector', '1');
        if (e.data.compare) params.set('compare', e.data.compare);
        const url = `/${e.data.locale}/bible/${e.data.translationCode}/${e.data.bookCode}/${e.data.chapter}?${params}`;
        window.location.assign(url);
      }
    };
    channelRef.current = ch;
    if (isDisplay) ch.postMessage({ type: 'ready' });
    return () => ch.close();
  }, [isDisplay]);

  // Auto-scroll the display so the smallest selected verse is comfortably visible
  // — placed near the top with the prior context above.
  const versesContainerRef = useRef<HTMLOListElement>(null);
  const verseElsRef = useRef<Map<number, HTMLLIElement>>(new Map());
  const minSelected = (() => {
    let m = Infinity;
    for (const v of selection) if (v < m) m = v;
    return Number.isFinite(m) ? m : firstVerse;
  })();
  useEffect(() => {
    const target = verseElsRef.current.get(minSelected);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [minSelected]);

  // Keyboard — only Escape closes; navigation is operator-only on the dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setPendingFullscreen(false);
  }

  if (!mounted) return null;

  return createPortal(
    <div className="bible-projector">
      {pendingFullscreen && (
        <button className="bible-projector__fs-overlay" onClick={enterFullscreen} aria-label={t('tapForFullscreen')}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t('tapForFullscreen')}</span>
        </button>
      )}

      {blank && <div className="bible-projector__blank" aria-label={t('blankScreen')} />}

      <div className="bible-projector__topbar">
        <div className="nav-logo bible-projector__brand" aria-hidden="true">
          SDARM<span>.life</span>
        </div>
        <div className="bible-projector__header">
          {chapter.book.name} {chapter.chapter} ·{' '}
          {isParallel ? `${parallel!.a.name} | ${parallel!.b.name}` : chapter.translation.name}
        </div>
        <button className="bible-projector__close" onClick={onClose} aria-label={t('close')}>
          ✕
        </button>
      </div>

      {isParallel ? (
        <ol
          ref={versesContainerRef}
          className="bible-projector__verses bible-projector__verses--parallel"
          style={{ fontSize: `${fontScale}em` }}
          aria-label={t('ariaVerseList')}
        >
          {parallelVerses.map((v) => {
            const isSelected = selection.has(v.verse);
            return (
              <li
                key={v.verse}
                ref={(el) => {
                  if (el) verseElsRef.current.set(v.verse, el);
                  else verseElsRef.current.delete(v.verse);
                }}
                className={`bible-projector__verse bible-projector__verse--parallel${isSelected ? ' is-active' : ''}`}
              >
                <span className="bible-projector__verse-num">{v.verse}</span>
                <span className="bible-projector__verse-text">{v.a ?? '—'}</span>
                <span className="bible-projector__verse-text bible-projector__verse-text--b">{v.b ?? '—'}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <ol
          ref={versesContainerRef}
          className="bible-projector__verses"
          style={{ fontSize: `${fontScale}em` }}
          aria-label={t('ariaVerseList')}
        >
          {verses.map((v) => {
            const isSelected = selection.has(v.verse);
            return (
              <li
                key={v.verse}
                ref={(el) => {
                  if (el) verseElsRef.current.set(v.verse, el);
                  else verseElsRef.current.delete(v.verse);
                }}
                className={`bible-projector__verse${isSelected ? ' is-active' : ''}`}
              >
                <span className="bible-projector__verse-num">{v.verse}</span>
                <span className="bible-projector__verse-text">{v.text}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>,
    document.body
  );
}
