'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SunsetClock, useCurrentTheme, withTheme } from '@sdarm/ui';
import { GRID_SLOT_IDS, parseGridConfig, pick, resolveTextColor } from '@sdarm/types';
import type { GridBlockConfig, GridBlockId, GridSlotId, HomeGridConfig } from '@sdarm/types';
import QuoteShareModal from './QuoteShareModal';
import { parseScreenshotVerse, pickVerse, splitVerse, type Verse } from '../lib/verses';
import { r2url, type NewsData } from '../lib/api';
import type { HomeLive } from '../lib/home-live';

// SDARM Germany on YouVersion. External link — nothing leaves the browser
// until the visitor clicks, so no DSGVO disclosure is needed.
const PLAN_URL =
  'https://www.bible.com/organizations/3f885b9c-404e-48be-8ad7-3d4e399560e7?utm_source=yvapp&utm_medium=share&utm_content=partner-page';

// TEMPORARY. The share image QuoteShareModal renders is still being designed,
// so the affordance that advertises it is off. Set to true to bring it back —
// the button and the modal are both untouched underneath.
const SHOW_VERSE_SAVE = false;

// Card headlines vary wildly in length — the verse alone runs 21 to 112
// characters, and a single long word like "Grundlagen" is wider than a narrow
// card at the sketch's 64px. Largest rung first; the fitter takes the first
// that fits both the height and the width of its card.
//
// The ladder has to reach far enough for the WORST case, not the average one:
// it used to stop at 17px, and the 112-character verse in a 156px-wide card at
// 360px still needed 24px more room than that. The card then grew past its
// min-height, and because the mobile columns are balanced by those heights
// (240 + 12 + 192 = 444 = 216 + 12 + 216) the two columns stopped ending level.
// The misalignment only showed on the hours when a long verse was up, which is
// what made it look intermittent.
const HEADLINE_SIZES = [64, 56, 48, 42, 36, 32, 28, 24, 20, 17, 15, 14, 13];

/** The photo the reading-plan card ships with, used until one is uploaded. */
const PLAN_FALLBACK_PHOTO = '/youversion-plan.webp';

/** Height class of each smaller slot: 420 + 280 in column 2, 350 + 350 in column 3. */
type SlotSize = 'media' | 'short' | 'mid';
const SLOT_SIZE: Record<GridSlotId, SlotSize> = {
  col2Top: 'media',
  col2Bottom: 'short',
  col3Top: 'mid',
  col3Bottom: 'mid',
};

export default function StatsGrid({
  newsData,
  grid,
  live,
  apiUrl,
}: {
  newsData?: NewsData;
  grid: HomeGridConfig;
  /** Lesson of the week, Psalm of the day, song of the week — fetched by the page. */
  live?: HomeLive;
  /** API base for the sunset card's location search — server env, passed down. */
  apiUrl?: string;
}) {
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
    //
    // This used to be a single setTimeout(120), which raced the page it was
    // measuring: at 120ms the globe, the fonts and the card photos are still
    // landing, so whatever offset it computed was stale a moment later and the
    // frame settled back on the hero. It also never ran again, so switching the
    // editor between desktop, tablet and mobile reflowed the document to a
    // different height while the scroll position stayed where the old layout
    // had put it. Keep the section pinned until things stop moving instead.
    let frame = 0;
    const pin = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    };
    pin();
    window.addEventListener('load', pin);
    window.addEventListener('resize', pin);
    const obs = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(pin);
    obs?.observe(document.documentElement);
    if (sectionRef.current) obs?.observe(sectionRef.current);

    return () => {
      cancelAnimationFrame(frame);
      obs?.disconnect();
      window.removeEventListener('load', pin);
      window.removeEventListener('resize', pin);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const cfg = draft ?? grid;

  // Empty initial verse so the SSR markup matches the client's first render —
  // the hour-based pick happens in an effect to avoid a hydration mismatch.
  const [verse, setVerse] = useState<Verse>({ text: '', ref: '' });

  useEffect(() => {
    // ?screenshotVerse=<index> pins the pick for screenshot tests (like the
    // sunset card's ?screenshotTime=); absent, the verse rotates with the hour.
    const override = parseScreenshotVerse(new URLSearchParams(window.location.search).get('screenshotVerse'));
    function refresh() {
      setVerse(pickVerse(locale, override));
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

      // The card is a fixed box (see --stats-card-h), so asking the CARD
      // whether it fits is useless: it reports its own clamped height at every
      // size, so the first rung always looks fine while the text is quietly
      // clipped.
      //
      // The body's scrollHeight is no good either. `.stats__card-content` sits
      // on `margin-top: auto`, and an auto margin in a fixed-height flex column
      // leaves scrollHeight a few pixels above clientHeight whatever the type
      // size — 4px on the songbook card at every rung from 64 down to 13, so
      // the fitter walked the whole ladder and set 17px on a card with room for
      // 56. Compare edges instead: the last child's bottom against the body's.
      // That is exact, and blind to the auto margin.
      const body = card.querySelector<HTMLElement>('.stats__card-body') ?? card;
      const last = body.lastElementChild;
      if (!last) continue;

      for (const size of HEADLINE_SIZES) {
        text.style.fontSize = `${size}px`;
        // The 1px slack absorbs sub-pixel rounding, which otherwise costs a
        // whole rung of type for nothing. The width test catches a single long
        // word that would run past the card edge.
        const fitsHeight = last.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom + 1;
        const fitsWidth = text.scrollWidth <= text.clientWidth + 1;
        if (fitsHeight && fitsWidth) break;
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
  const photos: Record<GridBlockId, string | null> = {
    plan: photoOf(blocks.plan, PLAN_FALLBACK_PHOTO),
    sunset: null,
    bible: photoOf(blocks.bible),
    sbl: photoOf(blocks.sbl),
    book: photoOf(blocks.book),
    verse: photoOf(blocks.verse),
    invite: photoOf(blocks.invite),
    faith: photoOf(blocks.faith),
  };

  /** The block in a slot, or null when the slot is empty or its block is hidden. */
  const placed = (slot: GridSlotId): GridBlockId | null => {
    const id = cfg.slots[slot];
    return id && blocks[id].visible ? id : null;
  };

  const showPlan = blocks.plan.visible;
  if (!showPlan && !GRID_SLOT_IDS.some((slot) => placed(slot))) return null;

  /** Headline: the editor's text for this locale, else the translation with its markup. */
  const headline = (b: GridBlockConfig, key: string) =>
    b.text[lang].title.trim() !== '' ? b.text[lang].title : t.rich(key, { em, br });

  /** Label, context line, headline, fact line and button — the live cards' shape. */
  function liveCard(
    id: 'bible' | 'sbl' | 'book',
    size: SlotSize,
    c: {
      href: string;
      label: string;
      /** Context line; `extra` is the part phones leave out. */
      kicker: { main: string; extra?: string } | null;
      headline: React.ReactNode;
      desc: string | null;
      cta: string | null;
      rule?: boolean;
      photoAlt?: string;
    }
  ) {
    const b = blocks[id];
    const photo = photos[id];
    const button = pick(b.text[lang].button, c.cta ?? '');
    // Live text always lies over the photo, so a live card never goes without
    // a scrim: 'none' and 'light' are read as 'medium' here.
    const scrimmed: GridBlockConfig =
      b.image.scrim === 'none' || b.image.scrim === 'light' ? { ...b, image: { ...b.image, scrim: 'medium' } } : b;
    return (
      <CardShell
        key={id}
        block={b}
        defaultHref={c.href}
        className={`stats__card stats__card--${size} stats__card--${id} stats__card--live${imageClasses(
          scrimmed,
          !!photo
        )}`}
      >
        {photo && photoLayer(scrimmed, photo, c.photoAlt ?? '')}
        {c.rule && !photo && <span className="stats__rule" aria-hidden="true" />}
        <div className="stats__card-body">
          {b.showLabel && <p className="stats__card-label">{pick(b.text[lang].label, c.label)}</p>}
          <div className="stats__card-content">
            {c.kicker && (
              <p className="stats__card-kicker">
                {c.kicker.main}
                {c.kicker.extra && <span className="stats__card-kicker-extra"> · {c.kicker.extra}</span>}
              </p>
            )}
            <p className="stats__card-big" data-fit>
              {c.headline}
            </p>
            {c.desc && <p className="stats__card-sub stats__card-desc">{c.desc}</p>}
            {b.showButton && button && <span className="stats__btn">{button}</span>}
          </div>
        </div>
      </CardShell>
    );
  }

  /**
   * One card, sized by the slot it sits in — every block can take any of the
   * four smaller slots, so the height comes from the slot, not the block.
   */
  function card(id: GridBlockId, size: SlotSize) {
    const b = blocks[id];
    const photo = photos[id];
    const sizeClass = `stats__card stats__card--${size}`;

    switch (id) {
      case 'sunset':
        // No label: the rings, the city and the countdown say what it is.
        return (
          <div key={id} className={`${sizeClass} stats__card--sunset`}>
            <div className="stats__card-body">
              <SunsetClock apiUrl={apiUrl} />
            </div>
          </div>
        );

      // The three live cards: a small line of context, the concrete thing as
      // the headline, a fact line in the taller slots. Headline overrides from
      // the admin do not apply — the content is the point of these cards.
      case 'bible': {
        const bible = live?.bible;
        return liveCard(id, size, {
          href: withTheme(bible?.href ?? newsData?.bibleUrl ?? '#', theme),
          label: t('bible.label'),
          kicker: bible ? { main: t('bible.kicker') } : null,
          headline: bible ? t.rich('bible.psalm', { n: bible.psalm, em }) : t.rich('bible.title', { em, br }),
          desc: bible && bible.translations > 0 ? t('bible.translations', { count: bible.translations }) : null,
          cta: t('bible.cta'),
        });
      }

      case 'sbl': {
        const lesson = live?.lesson;
        return liveCard(id, size, {
          href: newsData?.sblUrl ?? '#',
          label: t('sbl.label'),
          kicker: lesson ? { main: t('sbl.kicker', { no: lesson.no }), extra: lesson.range } : null,
          headline: lesson ? lesson.title : t.rich('sbl.title', { em, br }),
          desc: lesson ? (lesson.quarterTitle ? t('sbl.quarter', { title: lesson.quarterTitle }) : null) : t('sbl.sub'),
          cta: t('sbl.cta'),
          rule: true,
        });
      }

      case 'book': {
        const songs = live?.songs;
        return liveCard(id, size, {
          href: withTheme(songs?.song?.href ?? newsData?.song?.href ?? '#', theme),
          label: t('songs.label'),
          kicker: songs?.song
            ? { main: t('songs.weekly'), extra: t('songs.number', { number: songs.song.number }) }
            : null,
          headline: songs?.song ? songs.song.title : t.rich('songs.title', { em, br }),
          desc: songs ? t('songs.count', { songs: songs.totalSongs, books: songs.songbooks }) : null,
          cta: b.text[lang].button || null,
          photoAlt: t('songs.label'),
        });
      }

      case 'verse':
        return (
          <div
            key={id}
            className={`${sizeClass} stats__card--quote${imageClasses(b, !!photo)}`}
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
            {photo && photoLayer(b, photo, '')}
            {SHOW_VERSE_SAVE && (
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
            )}

            <div className="stats__card-body">
              {b.showLabel && <p className="stats__card-label">{t('verse.label')}</p>}
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
        );

      case 'invite':
        return (
          <CardShell
            key={id}
            block={b}
            defaultHref={`/${locale}/kontakt`}
            className={`${sizeClass} stats__card--invite${imageClasses(b, !!photo)}`}
          >
            {photo && photoLayer(b, photo, '')}
            <div className="stats__card-body">
              {b.showLabel && b.text[lang].label && <p className="stats__card-label">{b.text[lang].label}</p>}
              <div className="stats__card-content">
                <p className="stats__card-big" data-fit>
                  {headline(b, 'invite.title')}
                </p>
                {b.showButton && <span className="stats__btn">{pick(b.text[lang].button, t('invite.cta'))}</span>}
              </div>
            </div>
          </CardShell>
        );

      case 'faith':
        return (
          <CardShell
            key={id}
            block={b}
            defaultHref={newsData?.aboutUrl ?? `/${locale}/about`}
            className={`${sizeClass} stats__card--faith${imageClasses(b, !!photo)}`}
          >
            {photo ? (
              photoLayer(b, photo, '')
            ) : (
              <span className="stats__ghost" aria-hidden="true">
                25
              </span>
            )}
            <div className="stats__card-body">
              {b.showLabel && <p className="stats__card-label">{pick(b.text[lang].label, tr('faith.label'))}</p>}
              <div className="stats__card-content">
                <p className="stats__card-big" data-fit>
                  {headline(b, 'faith.title')}
                </p>
                {b.showButton && <span className="stats__btn">{pick(b.text[lang].button, tr('faith.sub'))}</span>}
              </div>
            </div>
          </CardShell>
        );

      default:
        return null;
    }
  }

  const slotCard = (slot: GridSlotId) => {
    const id = placed(slot);
    return id ? card(id, SLOT_SIZE[slot]) : null;
  };

  return (
    <>
      <section className="stats" id="neuigkeiten" ref={sectionRef}>
        <div className="stats__inner">
          <div className="stats__grid">
            <div className="stats__col">
              {showPlan && (
                <CardShell
                  block={blocks.plan}
                  defaultHref={PLAN_URL}
                  className={`stats__card stats__card--tall stats__card--plan${imageClasses(blocks.plan, !!photos.plan)}`}
                >
                  {photos.plan && photoLayer(blocks.plan, photos.plan, t('plan.phoneAlt'))}
                  <div className="stats__card-body">
                    {blocks.plan.showLabel && (
                      <p className="stats__card-label">{pick(blocks.plan.text[lang].label, t('plan.label'))}</p>
                    )}
                    <div className="stats__card-content">
                      <p className="stats__card-big" data-fit>
                        {headline(blocks.plan, 'plan.title')}
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
              {slotCard('col2Top')}
              {slotCard('col2Bottom')}
            </div>

            <div className="stats__col">
              {slotCard('col3Top')}
              {slotCard('col3Bottom')}
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
