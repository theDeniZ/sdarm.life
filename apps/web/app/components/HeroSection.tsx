'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export interface HeroPost {
  title: string;
  meta: string;
  excerpt: string; // preview text — shown on the strip card
  body: string;    // shown in the detail area above the strip
  imageUrl: string;  // hero background
  thumbUrl: string;  // strip card thumbnail (falls back to imageUrl if not set)
  imageAlt: string;
  slug: string;
}

const STATIC: HeroPost = {
  title: 'Die Reformation und ihre Folgen für Deutschland und die ganze Welt',
  meta: '21.09.2020 · Maksim Korol',
  excerpt: '',
  body: '',
  imageUrl:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg/1280px-Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg',
  thumbUrl:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg/1280px-Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg',
  imageAlt: 'Historisches Gemälde',
  slug: '#',
};

const INTERVAL = 5000;

function isUnoptimized(url: string) {
  return (
    url.startsWith('https://upload.wikimedia.org') ||
    url.startsWith('https://images.unsplash.com')
  );
}

export default function HeroSection({ posts }: { posts?: HeroPost[] }) {
  const slides = posts?.length ? posts : [STATIC];
  const N = slides.length;

  const [active, setActive]           = useState(0);
  const [leaving, setLeaving]         = useState<number | null>(null);
  const [shown, setShown]             = useState(0);
  const [textVisible, setTextVisible] = useState(true);

  const activeRef   = useRef(0);
  const cardRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef    = useRef<HTMLDivElement>(null);
  const autoRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const leaveTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const textTimers  = useRef<ReturnType<typeof setTimeout>[]>([]);

  const goTo = useCallback(
    (idx: number) => {
      const prev = activeRef.current;
      if (idx === prev) return;
      activeRef.current = idx;

      setLeaving(prev);
      const lt = setTimeout(
        () => setLeaving((lv) => (lv === prev ? null : lv)),
        340,
      );
      leaveTimers.current.push(lt);

      setActive(idx);

      // scroll the strip so the active card is centred
      requestAnimationFrame(() => {
        const wrap = stripRef.current;
        const card = cardRefs.current[idx];
        if (!wrap || !card) return;
        const wrapRect = wrap.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const target =
          wrap.scrollLeft +
          cardRect.left -
          wrapRect.left -
          (wrapRect.width - cardRect.width) / 2;
        wrap.scrollTo({ left: target, behavior: 'smooth' });
      });

      setTextVisible(false);
      const tt = setTimeout(() => {
        setShown(idx);
        setTextVisible(true);
      }, 420);
      textTimers.current.push(tt);
    },
    [],
  );

  const resetAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(
      () => goTo((activeRef.current + 1) % N),
      INTERVAL,
    );
  }, [goTo, N]);

  useEffect(() => {
    resetAuto();
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
      leaveTimers.current.forEach(clearTimeout);
      textTimers.current.forEach(clearTimeout);
    };
  }, [resetAuto]);

  const handleClick = useCallback(
    (i: number) => {
      goTo(i);
      resetAuto();
    },
    [goTo, resetAuto],
  );

  const post = slides[shown];

  return (
    <>
      <div className="hero">
        {/* Background image — same as active card, cross-fades with text */}
        <div className={`hero-bg${textVisible ? '' : ' hero-bg--fade'}`}>
          <Image
            src={slides[shown].imageUrl}
            alt=""
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            unoptimized={isUnoptimized(slides[shown].imageUrl)}
            priority
          />
        </div>
        <div className="hero-bg-overlay" />

        <div className="hero-text">
          <div className="hero-eye">Aktuell</div>
          <div className={`hero-meta${textVisible ? '' : ' hero-fade'}`}>
            {post.meta}
          </div>
          <h1 className={textVisible ? '' : 'hero-fade'}>{post.title}</h1>
          {post.body && (
            <p className={`hero-sub${textVisible ? '' : ' hero-fade'}`}>
              {post.body}
            </p>
          )}
        </div>
      </div>

      <div className="hero-strip-wrap" ref={stripRef}>
        <div className="hero-strip">
          {slides.map((slide, i) => {
            const cls = [
              'hero-card',
              active === i  ? 'active'  : '',
              leaving === i ? 'leaving' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={slide.slug + i}
                ref={(el) => { cardRefs.current[i] = el; }}
                className={cls}
                onClick={() => handleClick(i)}
              >
                <div className="hero-card-img">
                  <Image
                    src={slide.thumbUrl}
                    alt={slide.imageAlt}
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized={isUnoptimized(slide.thumbUrl)}
                    priority={i === 0}
                  />
                </div>
                <div className="hero-card-vl" />
                <div className="hero-card-vb" />
                <div className="hero-card-num">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="hero-card-text">
                  <div className="hero-card-title">{slide.excerpt || slide.title}</div>
                </div>
                <div className="hero-card-prog">
                  {active === i && (
                    <div key={`fill-${active}`} className="hero-card-prog-fill" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
