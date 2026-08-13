'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useCurrentTheme, withTheme } from '@sdarm/ui';
import QuoteShareModal from './QuoteShareModal';
import { pickVerse, type Verse } from '../lib/verses';
import type { NewsData } from '../lib/api';

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
  const t = useTranslations('web.releases');
  const theme = useCurrentTheme();
  // Empty initial verse so SSR HTML matches client first render — actual
  // hour-based pick happens in useEffect to avoid hydration mismatch.
  const [verse, setVerse] = useState<Verse>({ text: '', ref: '' });

  useEffect(() => {
    function refresh() {
      setVerse(pickVerse(locale));
    }
    refresh();
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60_000 - now.getSeconds() * 1_000 - now.getMilliseconds();
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      refresh();
      interval = setInterval(refresh, 3_600_000);
    }, msUntilNextHour);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [locale]);

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
            <em>{t('title')}</em>
          </h2>
        </div>

        <div className="masonry-wrap">
          <div className="masonry-grid" ref={gridRef}>
            {/* 1: Book — φ landscape · real treasure from API */}
            <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
              {newsData?.book?.href && (
                <a
                  href={withTheme(newsData.book.href, theme)}
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
                      {newsData?.book?.title ?? t('book.titleFallback')}
                      <br />
                      <br />
                      {newsData?.book?.author ?? t('book.authorFallback')}
                    </div>
                  </div>
                  <div className="nc-body">
                    <div className="nc-label">{t('book.label')}</div>
                    <div className="nc-title">{newsData?.book?.title ?? t('book.titleFallback')}</div>
                    <div className="nc-sub">
                      {t('book.sub', { author: newsData?.book?.author ?? t('book.authorFallback') })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2: Faith — φ landscape · static, links to /about (25 Punkte) */}
            <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
              <Link
                href={newsData?.aboutUrl ?? `/${locale}/about`}
                style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'block' }}
                aria-label={t('faith.title')}
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
                    <div className="nc-label">{t('faith.label')}</div>
                    <div className="nc-title">{t('faith.title')}</div>
                    <div className="nc-sub">{t('faith.sub')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3: Quote — φ² panoramic · click anywhere opens share modal */}
            <div className="masonry-item ratio-phi-h" onClick={() => setModalOpen(true)} style={{ cursor: 'pointer' }}>
              <div className="img-wrap">
                <div className="nc nc--quote">
                  <div className="nc-bg" />
                  <div className="nc-veil" />
                  <div className="nc-quote-accent">
                    <div className="nc-quote-bar" />
                    <div className="nc-quote-glyph">&ldquo;</div>
                  </div>
                  <button
                    className="quote-save-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalOpen(true);
                    }}
                    title={t('quote.saveImage')}
                    aria-label={t('quote.saveImage')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <div className="nc-body">
                    <div className="nc-title">{verse.text}</div>
                    <div className="nc-ref">{verse.ref}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ──────────────────────────────────────────────────────────────
                Cards 4-6 temporarily disabled — keep showing only the 3 most
                stable (Book / Faith / Quote). Uncomment when:
                  4 Song      — songs.sdarm.life is reliably deployed
                  5 YouVersion — actual reading plans launched (not "demnächst")
                  6 Event     — i18n strings done + linked event lives at events.sdarm.life
                ────────────────────────────────────────────────────────────── */}

            {/* 4: Song — φ landscape · real songbook from API */}
            {/* <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
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
            </div> */}

            {/* 5: YouVersion — φ landscape · placeholder; URL set via newsData */}
            {/* <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
              <a
                href={newsData?.youVersionUrl ?? 'https://www.bible.com/reading-plans'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'block' }}
                aria-label="Bibellesepläne auf YouVersion"
              />
              <div className="img-wrap">
                <div className="nc nc--youversion">
                  <div className="nc-bg" />
                  <div className="nc-veil" />
                  <div className="nc-bigicon">
                    <svg viewBox="0 0 24 24">
                      <path d="M3 5a2 2 0 012-2h7v18H5a2 2 0 01-2-2V5z" />
                      <path d="M21 5a2 2 0 00-2-2h-7v18h7a2 2 0 002-2V5z" />
                      <path d="M9 9l1.2 1.2L13 7.5" />
                    </svg>
                  </div>
                  <div className="nc-body">
                    <div className="nc-label">Bibel · YouVersion</div>
                    <div className="nc-title">Bibellesepläne</div>
                    <div className="nc-sub">Demnächst auf YouVersion verfügbar</div>
                  </div>
                </div>
              </div>
            </div> */}

            {/* 6: Event — φ landscape · static link to events.sdarm.life */}
            {/* <div className="masonry-item ratio-phi-h" style={{ position: 'relative' }}>
              <a
                href={newsData?.eventsUrl ?? 'https://events.sdarm.life'}
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
            </div> */}
          </div>
        </div>
      </section>

      <QuoteShareModal open={modalOpen} text={verse.text} ref_={verse.ref} onClose={() => setModalOpen(false)} />
    </>
  );
}
