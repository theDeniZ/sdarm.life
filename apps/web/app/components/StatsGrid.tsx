'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useCurrentTheme, withTheme } from '@sdarm/ui';
import { parseGridConfig, pick, resolveTextColor } from '@sdarm/types';
import type { GridBlockConfig, HomeGridConfig } from '@sdarm/types';
import QuoteShareModal from './QuoteShareModal';
import { pickVerse, splitVerse, type Verse } from '../lib/verses';
import { r2url, type NewsData } from '../lib/api';

// SDARM Germany on YouVersion. External link — nothing leaves the browser
// until the visitor clicks, so no DSGVO disclosure is needed.
const PLAN_URL =
  'https://www.bible.com/organizations/3f885b9c-404e-48be-8ad7-3d4e399560e7?utm_source=yvapp&utm_medium=share&utm_content=partner-page';

// Card headlines vary wildly in length — the verse alone runs 21 to 112
// characters, and a single long word like "Grundlagen" is wider than a narrow
// card at the sketch's 64px. Largest rung first; the fitter takes the first
// that fits both the height and the width of its card.
const HEADLINE_SIZES = [64, 56, 48, 42, 36, 32, 28, 24, 20, 17];

/** The photo the reading-plan card ships with, used until one is uploaded. */
const PLAN_FALLBACK_PHOTO = '/youversion-plan.webp';

export default function StatsGrid({ newsData, grid }: { newsData?: NewsData; grid: HomeGridConfig }) {
  const locale = useLocale();
  const lang = locale === 'en' ? 'en' : 'de';
  const t = useTranslations('web.stats');
  const tr = useTranslations('web.releases');
  const theme = useCurrentTheme();
  const [modalOpen, setModalOpen] = useState(false);

  // Preview: the admin renders this very page in an iframe and posts a draft
  // config into it, so what an editor sees before pressing Apply is the real
  // section rather than a second implementation that can drift from it.
  const [draft, setDraft] = useState<HomeGridConfig | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!new URLSearchParams(window.location.search).has('gridPreview')) return;

    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: string; config?: unknown } | null;
      if (!data || data.type !== 'sdarm:grid-preview') return;
      setDraft(parseGridConfig(JSON.stringify(data.config)));
    }
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: 'sdarm:grid-preview-ready' }, '*');

    // The admin's iframe is cross-origin, so it cannot scroll this document.
    // Bring the section into view from in here instead, otherwise the preview
    // shows the hero and the editor never sees what it is editing.
    const toGrid = setTimeout(() => sectionRef.current?.scrollIntoView({ block: 'start' }), 120);
    return () => {
      clearTimeout(toGrid);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const cfg = draft ?? grid;

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
  }, [fitHeadlines, verse.text, bookTitle, locale, cfg]);

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

  /** Classes an image-backed card needs: scrim strength and text colour. */
  const imageClasses = (b: GridBlockConfig, hasPhoto: boolean) =>
    hasPhoto
      ? ` stats__card--photo stats__card--scrim-${b.image.scrim} stats__card--on-${resolveTextColor(
          b.image.textColor,
          b.image.luminance
        )}`
      : '';

  const photoOf = (b: GridBlockConfig, fallback: string | null = null): string | null => {
    if (!b.image.enabled) return null;
    return b.image.key ? r2url(b.image.key, { w: 900 }) : fallback;
  };

  const photoLayer = (b: GridBlockConfig, src: string, alt: string) => (
    <>
      <Image
        className="stats__card-photo"
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 33vw"
        style={{ objectPosition: b.image.position }}
      />
      <span className="stats__card-scrim" aria-hidden="true" />
    </>
  );

  const blocks = cfg.blocks;
  const planPhoto = photoOf(blocks.plan, PLAN_FALLBACK_PHOTO);
  const invitePhoto = photoOf(blocks.invite);
  const bookPhoto = photoOf(blocks.book);
  const faithPhoto = photoOf(blocks.faith);
  const versePhoto = photoOf(blocks.verse);

  const eyebrow = pick(cfg.eyebrow[lang], t('eyebrow'));
  if (!Object.values(blocks).some((b) => b.visible)) return null;

  return (
    <>
      <section className="stats" id="neuigkeiten" ref={sectionRef}>
        <div className="stats__inner">
          <header className="stats__head">
            {eyebrow && <p className="stats__eyebrow">{eyebrow}</p>}
            <h2 className="stats__title">
              {cfg.title[lang].trim() !== '' ? cfg.title[lang] : t.rich('title', { em })}
            </h2>
          </header>

          <div className="stats__grid">
            <div className="stats__col">
              {blocks.plan.visible && (
                <CardShell
                  block={blocks.plan}
                  defaultHref={PLAN_URL}
                  className={`stats__card stats__card--tall stats__card--plan${imageClasses(blocks.plan, !!planPhoto)}`}
                >
                  {planPhoto && photoLayer(blocks.plan, planPhoto, t('plan.phoneAlt'))}
                  <div className="stats__card-body">
                    {blocks.plan.showLabel && (
                      <p className="stats__card-label">{pick(blocks.plan.text[lang].label, t('plan.label'))}</p>
                    )}
                    <div className="stats__card-content">
                      <p className="stats__card-big" data-fit>
                        {blocks.plan.text[lang].title.trim() !== ''
                          ? blocks.plan.text[lang].title
                          : t.rich('plan.title', { em, br })}
                      </p>
                      {blocks.plan.showButton && (
                        <span className="stats__btn">{pick(blocks.plan.text[lang].button, t('plan.cta'))}</span>
                      )}
                    </div>
                  </div>
                </CardShell>
              )}
            </div>

            <div className="stats__col">
              {blocks.verse.visible && (
                <div
                  className={`stats__card stats__card--media stats__card--quote${imageClasses(
                    blocks.verse,
                    !!versePhoto
                  )}`}
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
                  {versePhoto && photoLayer(blocks.verse, versePhoto, '')}
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
                    {blocks.verse.showLabel && <p className="stats__card-label">{t('verse.label')}</p>}
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
              )}

              {blocks.invite.visible && (
                <CardShell
                  block={blocks.invite}
                  defaultHref={`/${locale}/kontakt`}
                  className={`stats__card stats__card--short stats__card--invite${imageClasses(
                    blocks.invite,
                    !!invitePhoto
                  )}`}
                >
                  {invitePhoto && photoLayer(blocks.invite, invitePhoto, '')}
                  <div className="stats__card-body">
                    {blocks.invite.showLabel && blocks.invite.text[lang].label && (
                      <p className="stats__card-label">{blocks.invite.text[lang].label}</p>
                    )}
                    <div className="stats__card-content">
                      <p className="stats__card-big" data-fit>
                        {blocks.invite.text[lang].title.trim() !== ''
                          ? blocks.invite.text[lang].title
                          : t.rich('invite.title', { em, br })}
                      </p>
                      {blocks.invite.showButton && (
                        <span className="stats__btn">{pick(blocks.invite.text[lang].button, t('invite.cta'))}</span>
                      )}
                    </div>
                  </div>
                </CardShell>
              )}
            </div>

            <div className="stats__col">
              {blocks.book.visible && (
                <CardShell
                  block={blocks.book}
                  defaultHref={withTheme(newsData?.book?.href ?? '#', theme)}
                  className={`stats__card stats__card--mid${imageClasses(blocks.book, !!bookPhoto)}`}
                >
                  {bookPhoto && photoLayer(blocks.book, bookPhoto, bookTitle)}
                  <div className="stats__card-body">
                    {blocks.book.showLabel && (
                      <p className="stats__card-label">{pick(blocks.book.text[lang].label, tr('book.label'))}</p>
                    )}
                    <div className="stats__card-content">
                      <p className="stats__card-big" data-fit>
                        {pick(blocks.book.text[lang].title, bookTitle)}
                      </p>
                      {blocks.book.showButton && blocks.book.text[lang].button && (
                        <span className="stats__btn">{blocks.book.text[lang].button}</span>
                      )}
                    </div>
                  </div>
                </CardShell>
              )}

              {blocks.faith.visible && (
                <CardShell
                  block={blocks.faith}
                  defaultHref={newsData?.aboutUrl ?? `/${locale}/about`}
                  className={`stats__card stats__card--mid stats__card--faith${imageClasses(
                    blocks.faith,
                    !!faithPhoto
                  )}`}
                >
                  {faithPhoto ? (
                    photoLayer(blocks.faith, faithPhoto, '')
                  ) : (
                    <span className="stats__ghost" aria-hidden="true">
                      25
                    </span>
                  )}
                  <div className="stats__card-body">
                    {blocks.faith.showLabel && (
                      <p className="stats__card-label">{pick(blocks.faith.text[lang].label, tr('faith.label'))}</p>
                    )}
                    <div className="stats__card-content">
                      <p className="stats__card-big" data-fit>
                        {blocks.faith.text[lang].title.trim() !== ''
                          ? blocks.faith.text[lang].title
                          : t.rich('faith.title', { em, br })}
                      </p>
                      {blocks.faith.showButton && (
                        <span className="stats__btn">{pick(blocks.faith.text[lang].button, tr('faith.sub'))}</span>
                      )}
                    </div>
                  </div>
                </CardShell>
              )}
            </div>
          </div>
        </div>
      </section>

      <QuoteShareModal open={modalOpen} text={verse.text} ref_={verse.ref} onClose={() => setModalOpen(false)} />
    </>
  );
}

/**
 * A card is an internal link, an external link or a plain box depending on its
 * config. Kept in one place so "clickable" behaves identically on every block.
 */
function CardShell({
  block,
  defaultHref,
  className,
  children,
}: {
  block: GridBlockConfig;
  defaultHref: string;
  className: string;
  children: React.ReactNode;
}) {
  const href = block.href ?? defaultHref;
  if (!block.clickable) return <div className={className}>{children}</div>;

  if (/^https?:\/\//.test(href)) {
    return (
      <a
        className={className}
        href={href}
        target={block.newTab ? '_blank' : undefined}
        rel={block.newTab ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href} target={block.newTab ? '_blank' : undefined}>
      {children}
    </Link>
  );
}
