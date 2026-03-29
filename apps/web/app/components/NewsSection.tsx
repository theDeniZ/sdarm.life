'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import QuoteShareModal from './QuoteShareModal';
import type { NewsData } from '../lib/api';

const VERSES = {
  de: [
    { text: 'Ich vermag alles durch den, der mich stark macht.', ref: 'Philipper 4,13' },
    { text: 'Fürchte dich nicht, denn ich bin mit dir.', ref: 'Jesaja 41,10' },
    { text: 'Wirf deine Last auf den HERRN, der wird dich versorgen.', ref: 'Psalm 55,23' },
  ],
  en: [
    { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
    { text: 'Fear not, for I am with you.', ref: 'Isaiah 41:10' },
    { text: 'Cast your burden on the Lord, and he will sustain you.', ref: 'Psalm 55:22' },
  ],
} as const;

// Kept for API compatibility
export interface NewsPost {
  id: string;
  title: string;
  date: string;
  author: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
}

export default function NewsSection({ newsData }: { newsData?: NewsData }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const locale = useLocale();
  const verses = VERSES[locale as keyof typeof VERSES] ?? VERSES.de;
  const today = new Date();
  const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % verses.length;
  const verse = verses[dayIndex];

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = items.indexOf(entry.target as HTMLElement);
            setTimeout(() => (entry.target as HTMLElement).classList.add('is-visible'), i * 80);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    items.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <section className="events-section" id="neuigkeiten">
        <div className="neues-header">
          <h2 className="neues-title">
            <em>Neues</em>
          </h2>
        </div>

        <div className="masonry-wrap">
          <div className="masonry-grid" ref={gridRef}>
            {/* 1: Book — φ landscape */}
            <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
              {newsData?.book?.href && (
                <a
                  href={newsData.book.href}
                  style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'block' }}
                  aria-label={newsData.book.title}
                />
              )}
              <div className="img-wrap">
                <div className="nc nc--book">
                  <div className="nc-bg" />
                  <div className="nc-veil" />
                  <div className="nc-bigicon">
                    <svg viewBox="0 0 24 24">
                      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                    </svg>
                  </div>
                  <div className="nc-bookdeco">
                    <div className="nc-bookdeco-text">
                      {newsData?.book?.title ?? 'Путь ко Христу'}
                      <br />
                      <br />
                      {newsData?.book?.author ?? 'Ellen G. White'}
                    </div>
                  </div>
                  <div className="nc-body">
                    <div className="nc-label">Bibliothek · Neu</div>
                    <div className="nc-title">{newsData?.book?.title ?? 'Путь ко Христу'}</div>
                    <div className="nc-sub">
                      {newsData?.book?.author ?? 'Ellen G. White'} — jetzt in der Bibliothek verfügbar
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2: Faith — φ landscape */}
            <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
              <a
                href={`/${locale}/about`}
                style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'block' }}
                aria-label="Grundlagen unseres Glaubens"
              />
              <div className="img-wrap">
                <div className="nc nc--faith">
                  <div className="nc-bg" />
                  <div className="nc-veil" />
                  <div className="nc-bigicon">
                    <svg viewBox="0 0 24 24">
                      <polygon points="12,2 22,20 2,20" />
                      <circle cx="12" cy="13" r="1.5" />
                      <line x1="12" y1="11.5" x2="12" y2="7" />
                    </svg>
                  </div>
                  <div className="nc-body">
                    <div className="nc-label">Glaube · 25 Punkte</div>
                    <div className="nc-title">Grundlagen unseres Glaubens</div>
                    <div className="nc-sub">jetzt entdecken</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3: Quote — φ² panoramic */}
            <div
              className="masonry-item ratio-phi-w"
              onClick={() => setModalOpen(true)}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setModalOpen(true);
                }
              }}
            >
              <div className="img-wrap">
                <div className="nc nc--quote">
                  <div className="nc-bg" />
                  <div className="nc-veil" />
                  <div className="nc-quote-accent">
                    <div className="nc-quote-bar" />
                    <div className="nc-quote-glyph">&ldquo;</div>
                  </div>
                  <div className="nc-body">
                    <div className="nc-title">{verse.text}</div>
                    <div className="nc-ref">{verse.ref}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4: Song — φ portrait */}
            <div className="masonry-item ratio-phi-v" style={{ position: 'relative' }}>
              {newsData?.song?.href && (
                <a
                  href={newsData.song.href}
                  style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'block' }}
                  aria-label={newsData.song.title}
                />
              )}
              <div className="img-wrap">
                <div className="nc nc--song">
                  <div className="nc-bg" />
                  <div className="nc-veil" />
                  <div className="nc-wave">
                    {[30, 55, 80, 45, 90, 60, 75, 35, 65, 85, 50, 70, 40, 95, 55, 30].map((h, i) => (
                      <span key={i} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="nc-bigicon">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div className="nc-body">
                    <div className="nc-label">
                      Liederbuch · {newsData?.song?.songCount ? `${newsData.song.songCount} Lieder` : 'Neu'}
                    </div>
                    <div className="nc-title">{newsData?.song?.title ?? 'Adventlieder'}</div>
                    <div className="nc-sub">Jetzt in der Liederbibliothek</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5: Sermon — φ landscape */}
            <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
              {newsData?.sermon?.href && (
                <Link
                  href={newsData.sermon.href}
                  style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'block' }}
                  aria-label={newsData.sermon.title}
                />
              )}
              <div className="img-wrap">
                <div className="nc nc--sermon">
                  <div className="nc-bg" />
                  <div className="nc-veil" />
                  <div className="nc-bigicon">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </div>
                  <div className="nc-body">
                    <div className="nc-label">Predigt · {newsData?.sermon?.date ?? 'Neueste'}</div>
                    <div className="nc-title">{newsData?.sermon?.title ?? 'Der Sabbat — Zeichen der Treue'}</div>
                    <div className="nc-sub">{newsData?.sermon?.author ?? 'Br. Daniel Hoffmann'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6: Bible Study — φ landscape */}
            <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
              {newsData?.study?.href && (
                <Link
                  href={newsData.study.href}
                  style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'block' }}
                  aria-label={newsData.study.title}
                />
              )}
              <div className="img-wrap">
                <div className="nc nc--study">
                  <div className="nc-bg" />
                  <div className="nc-veil" />
                  <div className="nc-bigicon">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="nc-body">
                    <div className="nc-label">Beitrag · Neu</div>
                    <div className="nc-title">{newsData?.study?.title ?? 'Das Gesetz Gottes'}</div>
                    <div className="nc-sub">Jetzt lesen</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 7: Event — φ landscape */}
            <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
              <a
                href={newsData?.eventsUrl}
                style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'block' }}
                aria-label="Zum Veranstaltungskalender"
              />
              <div className="img-wrap">
                <div className="nc nc--event">
                  <div className="nc-bg" />
                  <div className="nc-veil" />
                  <div className="nc-bigicon">
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div className="nc-body">
                    <div className="nc-label">Gottesdienst · Wöchentlich</div>
                    <div className="nc-title">Sabbat Pforzheim</div>
                    <div className="nc-sub">jeden Samstag · 15:00 Uhr · Pforzheim</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <QuoteShareModal open={modalOpen} text={verse.text} ref_={verse.ref} onClose={() => setModalOpen(false)} />
    </>
  );
}
