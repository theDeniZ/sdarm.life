'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useCurrentTheme, withTheme } from '@sdarm/ui';
import QuoteShareModal from './QuoteShareModal';
import { pickVerse, splitVerse, type Verse } from '../lib/verses';
import type { NewsData } from '../lib/api';

// SDARM Germany on YouVersion. External link — nothing leaves the browser
// until the visitor clicks, so no DSGVO disclosure is needed.
const PLAN_URL =
  'https://www.bible.com/organizations/3f885b9c-404e-48be-8ad7-3d4e399560e7?utm_source=yvapp&utm_medium=share&utm_content=partner-page';

// Card headlines vary wildly in length — the verse alone runs 21 to 112
// characters, and a single long word like "Grundlagen" is wider than a narrow
// card at the sketch's 64px. Largest rung first; the fitter takes the first
// that fits both the height and the width of its card.
const HEADLINE_SIZES = [64, 56, 48, 42, 36, 32, 28, 24, 20, 17];

export default function StatsGrid({ newsData }: { newsData?: NewsData }) {
  const locale = useLocale();
  const t = useTranslations('web.stats');
  const tr = useTranslations('web.releases');
  const theme = useCurrentTheme();
  const [modalOpen, setModalOpen] = useState(false);

  // Empty initial verse so the SSR markup matches the client's first render —
  // the hour-based pick happens in an effect to avoid a hydration mismatch.
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

  const bookTitle = newsData?.book?.title ?? tr('book.titleFallback');

  // Fit every headline to its card rather than letting text stretch or escape
  // it — the grid's column arithmetic depends on the card heights holding.
  // Cards use min-height, so measuring while the text is still large would
  // measure an already-grown card: shrink to the smallest rung first, read the
  // card at its natural height, then take the largest rung that fits.
  const sectionRef = useRef<HTMLElement>(null);

  const fitHeadlines = useCallback(() => {
    const root = sectionRef.current;
    if (!root) return;

    for (const text of Array.from(root.querySelectorAll<HTMLElement>('[data-fit]'))) {
      const card = text.closest<HTMLElement>('.stats__card');
      if (!card || !text.textContent?.trim()) continue;

      // Measure against the height the card is *supposed* to have, not the one
      // it currently has — a card that already overflowed reports the grown
      // height, and every size would then look like it fits. min-height is
      // border-box (see the global box-sizing reset) while scrollHeight is not,
      // so the borders come off.
      const style = getComputedStyle(card);
      const target =
        parseFloat(style.minHeight) - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);
      if (!Number.isFinite(target) || target <= 0) continue;

      for (const size of HEADLINE_SIZES) {
        text.style.fontSize = `${size}px`;
        // scrollHeight covers the whole card, so margins and siblings are
        // accounted for without having to enumerate them. The width test
        // catches a single long word that would run past the card edge.
        if (card.scrollHeight <= target && text.scrollWidth <= text.clientWidth) break;
      }
    }
  }, []);

  useEffect(() => {
    fitHeadlines();
  }, [fitHeadlines, verse.text, bookTitle, locale]);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const obs = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fitHeadlines);
    });
    obs.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
    };
  }, [fitHeadlines]);

  const em = (chunks: React.ReactNode) => <em>{chunks}</em>;
  const br = () => <br />;
  const verseParts = verse.text ? splitVerse(verse.text, locale) : null;

  return (
    <>
      <section className="stats" id="neuigkeiten" ref={sectionRef}>
        <div className="stats__inner">
          <header className="stats__head">
            <p className="stats__eyebrow">{t('eyebrow')}</p>
            <h2 className="stats__title">{t.rich('title', { em })}</h2>
          </header>

          <div className="stats__grid">
            {/* Reading plan — the one card that sends people off-site */}
            <div className="stats__col">
              <a
                className="stats__card stats__card--tall stats__card--plan"
                href={PLAN_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  className="stats__card-photo"
                  src="/youversion-plan.webp"
                  alt={t('plan.phoneAlt')}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <span className="stats__card-scrim" aria-hidden="true" />

                <div className="stats__card-body">
                  <p className="stats__card-label">{t('plan.label')}</p>
                  <div className="stats__card-content">
                    <p className="stats__card-big" data-fit>
                      {t.rich('plan.title', { em, br })}
                    </p>
                    <span className="stats__btn">{t('plan.cta')}</span>
                  </div>
                </div>
              </a>
            </div>

            <div className="stats__col">
              {/* Verse of the hour — click anywhere opens the share-image modal */}
              <div
                className="stats__card stats__card--media stats__card--quote"
                role="button"
                tabIndex={0}
                onClick={() => setModalOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setModalOpen(true);
                  }
                }}
                aria-label={tr('quote.openShare')}
              >
                <button
                  className="quote-save-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalOpen(true);
                  }}
                  title={tr('quote.saveImage')}
                  aria-label={tr('quote.saveImage')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>

                <div className="stats__card-body">
                  <div className="stats__card-content">
                    <p className="stats__card-big" data-fit>
                      {verseParts ? (
                        <>
                          {verseParts.before}
                          <em>{verseParts.word}</em>
                          {verseParts.after}
                        </>
                      ) : (
                        verse.text
                      )}
                    </p>
                    <p className="stats__card-sub">{verse.ref}</p>
                  </div>
                </div>
              </div>

              {/* Invitation — leads to Kontakt, where the map and the addresses
                  of every congregation are */}
              <Link className="stats__card stats__card--short stats__card--invite" href={`/${locale}/kontakt`}>
                <div className="stats__card-body">
                  <div className="stats__card-content">
                    <p className="stats__card-big" data-fit>
                      {t.rich('invite.title', { em, br })}
                    </p>
                    <span className="stats__btn">{t('invite.cta')}</span>
                  </div>
                </div>
              </Link>
            </div>

            <div className="stats__col">
              {/* Latest book — live from the treasures API */}
              <a className="stats__card stats__card--mid" href={withTheme(newsData?.book?.href ?? '#', theme)}>
                <div className="stats__card-body">
                  <p className="stats__card-label">{tr('book.label')}</p>
                  <div className="stats__card-content">
                    <p className="stats__card-big" data-fit>
                      {bookTitle}
                    </p>
                  </div>
                </div>
              </a>

              {/* 25 points of faith */}
              <Link
                className="stats__card stats__card--mid stats__card--faith"
                href={newsData?.aboutUrl ?? `/${locale}/about`}
              >
                <span className="stats__ghost" aria-hidden="true">
                  25
                </span>
                <div className="stats__card-body">
                  <div className="stats__card-content">
                    <p className="stats__card-big" data-fit>
                      {t.rich('faith.title', { em, br })}
                    </p>
                    <span className="stats__btn">{tr('faith.sub')}</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <QuoteShareModal open={modalOpen} text={verse.text} ref_={verse.ref} onClose={() => setModalOpen(false)} />
    </>
  );
}
