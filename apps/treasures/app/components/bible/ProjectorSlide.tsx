'use client';

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  bindShortWords,
  focusSecondaryPx,
  isPlainPublicDomain,
  MAX_SLIDE_PARTS,
  maxTextPx,
  MIN_TEXT_PX,
  slideReference,
  SPLIT_BELOW_PX,
  splitSlide,
  titleBookNames,
  type ProjectorLayout,
  type ProjectorTheme,
  type Slide,
  type SlideOptions,
  type SlideRow,
  type SlideSide,
} from '../../lib/projector';
import { useTranslations } from 'next-intl';
import { licenseNotice } from '../../lib/bible';
import Wordmark from './Wordmark';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export interface SlideFit {
  /** Verse size auto-fit settled on, in stage pixels. */
  px: number;
  /** True when the text does not fit even at the floor size on the most screens allowed. */
  overflow: boolean;
  /** How many screens the slide is split across — 1 when it fits on one. */
  parts: number;
}

interface SlideProps {
  slide: Slide | null;
  layout: ProjectorLayout;
  theme: ProjectorTheme;
  scale: number;
  options: SlideOptions;
  /** Screen of a split slide to show (0-based); clamped to the screens there are. */
  part?: number;
  blank?: boolean;
  onFit?: (fit: SlideFit) => void;
}

/** How a slide is being split: while `probe` is set, every screen is measured once. */
interface SplitState {
  inputs: object;
  parts: number;
  probe: number | null;
  /** Smallest size any screen needed, so all screens of one slide share a size. */
  capPx: number;
}

/**
 * One projected slide on a fixed 1920×1080 stage.
 *
 * The stage never reflows with the window: `ProjectorFrame` scales it as a
 * whole, so the display, the console mirror and the preview thumbnail lay the
 * text out identically and auto-fit arrives at the same size on all three.
 *
 * Auto-fit starts from the largest size the design gives this layout and
 * number of translations and steps down 2 px at a time until the text fits
 * its box. It writes a CSS variable straight onto the stage — no React state
 * per step — and reports the result once.
 *
 * Below `SPLIT_BELOW_PX` (36 px) the slide is split across screens instead of
 * set denser (`splitSlide`), onto as many screens as it takes; only on the
 * last split allowed (`MAX_SLIDE_PARTS`) may the size go on down to the 32 px
 * floor. Every screen of the
 * split is measured in layout effects before the browser paints, and all of
 * them use the smallest size any one needed. Since the three stages lay out
 * identically, they all arrive at the same split; the console only says which
 * screen to show.
 *
 * License: when every translation on the slide is plain public domain, one
 * quiet centred line at the bottom names them all; a translation whose
 * license asks for more (a required notice, or any basis but public domain)
 * gets its notice verbatim under its own text. The shared line is in the
 * footer and the notices inside the measured box, so auto-fit keeps room for
 * both. The wordmark sits top
 * right in its own reserved place (the heads of the room hide the bottom of
 * the screen), outside the measured box, so auto-fit can never shrink or
 * cover it; on black-out it is all that stays, dimmer, in the same place.
 */
export default function ProjectorSlide({ slide, layout, theme, scale, options, part = 0, blank, onFit }: SlideProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onFitRef = useRef(onFit);
  useEffect(() => {
    onFitRef.current = onFit;
  }, [onFit]);

  const count = slide?.sides.length ?? 1;
  // Grid and columns need at least two translations to mean anything.
  const effectiveLayout: ProjectorLayout = count === 1 ? 'rows' : layout;
  const top = maxTextPx(effectiveLayout, count, scale);

  // Web fonts that arrive after the first measurement start the split over.
  const [fontsEpoch, setFontsEpoch] = useState(0);
  const inputs = useMemo(
    () => ({ slide, effectiveLayout, scale, options, theme, fontsEpoch }),
    [slide, effectiveLayout, scale, options, theme, fontsEpoch]
  );
  const [split, setSplit] = useState<SplitState>({ inputs, parts: 1, probe: 0, capPx: top });
  // New content: measure from one screen again (reset during render, not in an effect).
  let current = split;
  if (split.inputs !== inputs) {
    current = { inputs, parts: 1, probe: 0, capPx: top };
    setSplit(current);
  }

  const pages = useMemo(() => (slide ? splitSlide(slide, current.parts) : []), [slide, current.parts]);
  const probing = current.probe !== null;
  const shown = Math.min(probing ? (current.probe ?? 0) : Math.max(part, 0), Math.max(pages.length - 1, 0));
  const page = pages[shown] ?? null;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const body = bodyRef.current;
    if (!stage || !body || split.inputs !== inputs) return;
    const apply = (px: number) => {
      stage.style.setProperty('--bps-px', `${px}px`);
      stage.style.setProperty('--bps-px2', `${focusSecondaryPx(px, count)}px`);
    };
    const overflows = () => body.scrollHeight > body.clientHeight + 1;
    // While more screens are still allowed, split rather than go below 36 px.
    const floor = probing && split.parts < MAX_SLIDE_PARTS ? SPLIT_BELOW_PX : MIN_TEXT_PX;
    let px = probing ? top : Math.min(top, split.capPx);
    apply(px);
    while (px > floor && overflows()) {
      px -= 2;
      apply(px);
    }
    const overflow = overflows();

    if (split.probe !== null) {
      if (overflow && split.parts < MAX_SLIDE_PARTS && slide) {
        // Jump straight to about as many screens as the overflow suggests.
        const needed = Math.ceil((split.parts * body.scrollHeight) / body.clientHeight);
        const parts = Math.min(MAX_SLIDE_PARTS, Math.max(split.parts + 1, needed));
        setSplit({ inputs, parts, probe: 0, capPx: top });
      } else if (split.probe < pages.length - 1) {
        setSplit({ ...split, probe: split.probe + 1, capPx: Math.min(split.capPx, px) });
      } else {
        setSplit({ ...split, probe: null, capPx: Math.min(split.capPx, px) });
      }
    } else {
      onFitRef.current?.({ px, overflow, parts: Math.max(pages.length, 1) });
    }
  }, [split, inputs, probing, top, count, pages, slide, shown]);

  // A measurement can run on fallback metrics while a face (or a script's
  // subset, e.g. Cyrillic) is still loading. Every finished font load starts
  // the split over, so a stale measurement never sticks.
  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) return;
    const remeasure = () => setFontsEpoch((n) => n + 1);
    fonts.addEventListener('loadingdone', remeasure);
    return () => fonts.removeEventListener('loadingdone', remeasure);
  }, []);

  const reference = slide ? slideReference(slide) : '';
  const names = slide ? titleBookNames(slide.sides, options.allBookNames) : [];
  // Verse numbers follow the whole slide, not the screen of it on show.
  const multi = (slide?.rows.length ?? 0) > 1;
  const partLabel = !probing && pages.length > 1 ? `${shown + 1}/${pages.length}` : null;
  // Plain public-domain texts share one line; the others carry their own notice.
  const plain = slide ? slide.sides.filter((s) => isPlainPublicDomain(s.license)) : [];
  const allPlain = slide !== null && plain.length === slide.sides.length;

  return (
    <div
      ref={stageRef}
      className={`bps bps--${theme} bps--${effectiveLayout} bps--n${count}`}
      style={{ width: STAGE_W, height: STAGE_H }}
    >
      {slide && (
        <>
          <h1 className="bps-title" key={`t-${reference}-${names.join()}`}>
            {names.map((n, i) => (
              <Fragment key={n}>
                {i > 0 && <span className="bps-title__dot">·</span>}
                <span>{n}</span>
              </Fragment>
            ))}
            <span className="bps-title__ref">{reference}</span>
            {partLabel && <span className="bps-title__part">{partLabel}</span>}
          </h1>
          <div className="bps-rule" />
        </>
      )}

      <div ref={bodyRef} className="bps-body">
        {page && (
          <div
            className="bps-content"
            key={`${page.bookCode}-${reference}-${page.sides.map((s) => s.code).join()}-${pages.length}-${shown}`}
          >
            {effectiveLayout === 'columns' ? (
              <ColumnsLayout slide={page} options={options} multi={multi} />
            ) : effectiveLayout === 'focus' ? (
              <FocusLayout slide={page} options={options} multi={multi} />
            ) : (
              <div className={effectiveLayout === 'grid' ? 'bps-grid' : 'bps-rows'}>
                {page.sides.map((side, i) => (
                  <section key={side.code} className="bps-cell">
                    {options.labels && <SideLabel side={side} slide={page} />}
                    <div className="bps-cell__body">
                      <p className="bps-text">
                        <SideText slide={page} index={i} numbers={multi} />
                      </p>
                      <SideNote side={side} />
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {slide && plain.length > 0 && (
        <footer className="bps-foot">
          <PublicDomainLine sides={plain} all={allPlain} />
        </footer>
      )}

      <Wordmark className="bps-brand" decorative />

      {blank && (
        <div className="bps-blank">
          <Wordmark className="bps-brand" decorative />
        </div>
      )}
    </div>
  );
}

/**
 * The license line of a translation whose license asks for more than "public
 * domain", directly under its own text, so the room can see which notice
 * belongs to which language. Printed verbatim (`licenseNotice`) — a rights
 * holder's wording is a license condition — and with no register link: a
 * link on the projector is a way to navigate the room's screen away from
 * scripture mid-service.
 */
function SideNote({ side }: { side: SlideSide }) {
  if (isPlainPublicDomain(side.license)) return null;
  const text = licenseNotice(side.license);
  return text ? <p className="bps-note">{text}</p> : null;
}

/** «RST · KJV · LUT — Public domain», one quiet centred line for all plain public-domain texts. */
function PublicDomainLine({ sides, all }: { sides: SlideSide[]; all: boolean }) {
  const t = useTranslations('treasures.bible');
  return (
    <p className={`bps-pd${all ? '' : ' bps-pd--some'}`}>
      {sides.map((s) => s.abbreviation).join(' · ')}
      <span className="bps-pd__dash">—</span>
      {t('prPublicDomain')}
    </p>
  );
}

/** Just the translation's label — the room recognises its language by the text itself. */
function SideLabel({ side, slide }: { side: SlideSide; slide: Slide }) {
  // Across LXX/Hebrew Psalms a side reads a different chapter than the title
  // names; say so beside that side rather than let the numbers disagree silently.
  return (
    <div className="bps-label">
      <span className="bps-label__abbr">{side.abbreviation}</span>
      {side.chapter !== slide.chapter && <span className="bps-label__chapter">{side.chapter}</span>}
    </div>
  );
}

function SideText({ slide, index, numbers }: { slide: Slide; index: number; numbers: boolean }) {
  return (
    <>
      {slide.rows.map((row, i) => (
        <Fragment key={row.verse}>
          {i > 0 && ' '}
          {numbers && !row.continued && <sup className="bps-vn">{row.verse}</sup>}
          <VerseText row={row} index={index} />
        </Fragment>
      ))}
    </>
  );
}

/** One translation's text of a row; a verse split across screens is marked with an ellipsis where it breaks. */
function VerseText({ row, index }: { row: SlideRow; index: number }): ReactNode {
  const text = row.texts[index];
  if (text === null || text === undefined) return <span className="bps-missing">—</span>;
  return (
    <>
      {row.continued && <span className="bps-cont">…&#8201;</span>}
      {bindShortWords(text)}
      {row.continues && <span className="bps-cont">&#8201;…</span>}
    </>
  );
}

/** Columns — one column per translation; a verse range becomes rows aligned across columns. */
function ColumnsLayout({ slide, options, multi }: { slide: Slide; options: SlideOptions; multi: boolean }) {
  const cols = `${multi ? '64px ' : ''}repeat(${slide.sides.length}, minmax(0, 1fr))`;
  return (
    <div className={`bps-table${multi ? ' bps-table--numbered' : ''}`} style={{ gridTemplateColumns: cols }}>
      {options.labels && (
        <>
          {multi && <span className="bps-table__head" />}
          {slide.sides.map((side, i) => (
            <div key={side.code} className={`bps-table__head bps-table__col${i > 0 ? ' bps-table__col--rest' : ''}`}>
              <SideLabel side={side} slide={slide} />
            </div>
          ))}
        </>
      )}
      {slide.rows.map((row, r) => (
        <Fragment key={row.verse}>
          {multi && <span className={`bps-table__num${r > 0 ? ' bps-table__sep' : ''}`}>{row.verse}</span>}
          {slide.sides.map((side, i) => (
            <p
              key={side.code}
              className={`bps-text bps-table__col${i > 0 ? ' bps-table__col--rest' : ''}${r > 0 ? ' bps-table__sep' : ''}`}
            >
              <VerseText row={row} index={i} />
            </p>
          ))}
        </Fragment>
      ))}
      {multi && <span />}
      {slide.sides.map((side, i) => (
        <div key={side.code} className={`bps-table__foot bps-table__col${i > 0 ? ' bps-table__col--rest' : ''}`}>
          <SideNote side={side} />
        </div>
      ))}
    </div>
  );
}

/** Focus — the primary translation large, the others beside each other underneath. */
function FocusLayout({ slide, options, multi }: { slide: Slide; options: SlideOptions; multi: boolean }) {
  const [primary, ...others] = slide.sides;
  return (
    <>
      <section className="bps-cell bps-focus__primary">
        {options.labels && <SideLabel side={primary} slide={slide} />}
        <div className="bps-cell__body">
          <p className="bps-text">
            <SideText slide={slide} index={0} numbers={multi} />
          </p>
          <SideNote side={primary} />
        </div>
      </section>
      {others.length > 0 && (
        <div className="bps-focus__others" style={{ gridTemplateColumns: `repeat(${others.length}, minmax(0, 1fr))` }}>
          {others.map((side, i) => (
            <section key={side.code} className="bps-cell">
              {options.labels && <SideLabel side={side} slide={slide} />}
              <div className="bps-cell__body">
                <p className="bps-text bps-text--secondary">
                  <SideText slide={slide} index={i + 1} numbers={multi} />
                </p>
                <SideNote side={side} />
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Scales the fixed stage into whatever box it is given. `contain` letterboxes
 * it inside the window (the display); `width` fills a container's width at
 * 16:9 (the console mirror and preview).
 */
export function ProjectorFrame({ fit, children }: { fit: 'contain' | 'width'; children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = box ? (fit === 'contain' ? Math.min(box.w / STAGE_W, box.h / STAGE_H) : box.w / STAGE_W) : 0;
  const left = box && fit === 'contain' ? (box.w - STAGE_W * s) / 2 : 0;
  const top = box && fit === 'contain' ? (box.h - STAGE_H * s) / 2 : 0;

  return (
    <div ref={boxRef} className={`bps-frame bps-frame--${fit}`}>
      {box && (
        <div className="bps-frame__stage" style={{ transform: `translate(${left}px, ${top}px) scale(${s})` }}>
          {children}
        </div>
      )}
    </div>
  );
}

const noSubscribe = () => () => {};

/**
 * False on the server and during hydration, true after — for the portals,
 * which need `document.body`. Reading `window` in a state initialiser instead
 * renders differently on the client's first pass and breaks hydration.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  );
}
