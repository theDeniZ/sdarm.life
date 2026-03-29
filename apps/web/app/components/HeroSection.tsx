'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface HeroPost {
  title: string;
  meta: string;
  excerpt: string;
  body: string;
  imageUrl: string;
  thumbUrl: string;
  imageAlt: string;
  slug: string;
}

function makeStatic(t: (key: string) => string): HeroPost {
  return {
    title: t('fallbackTitle'),
    meta: '21.09.2020 · Maksim Korol',
    excerpt: '',
    body: '',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg/1280px-Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg',
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg/1280px-Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg',
    imageAlt: t('fallbackAlt'),
    slug: '#',
  };
}

const TINTS = [
  'radial-gradient(ellipse at 62% 28%, rgba(90,62,28,0.32) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(40,22,8,0.45) 0%, transparent 50%)',
  'radial-gradient(ellipse at 62% 28%, rgba(28,50,80,0.30) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(10,22,40,0.40) 0%, transparent 50%)',
  'radial-gradient(ellipse at 62% 28%, rgba(70,40,18,0.28) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(30,14,6,0.40) 0%, transparent 50%)',
  'radial-gradient(ellipse at 62% 28%, rgba(22,36,60,0.28) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(10,18,32,0.40) 0%, transparent 50%)',
  'radial-gradient(ellipse at 62% 28%, rgba(55,32,14,0.28) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(28,12,4,0.38) 0%, transparent 50%)',
];

const THUMB_COLORS = [
  'rgba(120,88,40,.55)',
  'rgba(40,60,100,.55)',
  'rgba(100,60,20,.55)',
  'rgba(30,50,90,.55)',
  'rgba(90,50,15,.55)',
];

const INTERVAL = 5000;

function nextSabbath(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntil = day === 6 ? 7 : 6 - day;
  d.setDate(d.getDate() + daysUntil);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function HeroSection({ posts, bgUrl }: { posts?: HeroPost[]; bgUrl?: string | null }) {
  const t = useTranslations('web.hero');
  const slides = posts?.length ? posts : [makeStatic(t)];
  const N = slides.length;

  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0);
  const [textVisible, setTextVisible] = useState(true);

  const activeRef = useRef(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const goTo = useCallback((idx: number) => {
    const prev = activeRef.current;
    if (idx === prev) return;
    activeRef.current = idx;
    setActive(idx);
    setTextVisible(false);
    const tt = setTimeout(() => {
      setShown(idx);
      setTextVisible(true);
    }, 420);
    textTimers.current.push(tt);
  }, []);

  const resetAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(() => goTo((activeRef.current + 1) % N), INTERVAL);
  }, [goTo, N]);

  useEffect(() => {
    resetAuto();
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
      textTimers.current.forEach(clearTimeout);
    };
  }, [resetAuto]);

  const handleClick = useCallback(
    (i: number) => {
      goTo(i);
      resetAuto();
    },
    [goTo, resetAuto]
  );

  const post = slides[shown];

  return (
    <div className="hero-outer">
      <section className="hero">
        <div className="hero-base" />

        {bgUrl && (
          <div className="hero-bg-img hero-bg-img--base visible" style={{ backgroundImage: `url(${bgUrl})` }} />
        )}

        {slides.map((slide, i) => (
          <div
            key={i}
            className={`hero-bg-img${active === i ? ' visible' : ''}`}
            style={{ backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined }}
          />
        ))}

        {slides.map((_, i) => (
          <div
            key={i}
            className={`hero-tint${active === i ? ' visible' : ''}`}
            style={{ background: TINTS[i % TINTS.length] }}
          />
        ))}

        <div className="fog" />
        <div className="sculpture" />
        <div className="deco-circle" />

        <div className="side-label">
          <div className="lbl">{post.meta || t('fallbackLabel')}</div>
          <div className="cnt">
            {String(active + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
          </div>
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">{post.meta}</div>
          <h1 className={`hero-title${textVisible ? '' : ' fade-out'}`}>{post.title}</h1>
          {post.body && <p className={`hero-sub${textVisible ? '' : ' fade-out'}`}>{post.body}</p>}
        </div>

        <div className="hero-events-list" style={{ gridTemplateColumns: `${slides.map(() => '1fr').join(' ')} 220px` }}>
          {slides.map((slide, i) => (
            <div
              key={slide.slug + i}
              className={`hev-item${active === i ? ' active' : ''}`}
              onClick={() => handleClick(i)}
            >
              <div className="hev-thumb">
                {slide.thumbUrl ? (
                  <div
                    className="hev-thumb-inner"
                    style={{
                      backgroundImage: `url(${slide.thumbUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                ) : (
                  <div
                    className="hev-thumb-inner"
                    style={{
                      background: `radial-gradient(ellipse at 60% 30%, ${THUMB_COLORS[i % THUMB_COLORS.length]} 0%, rgba(8,6,3,1) 75%)`,
                    }}
                  />
                )}
              </div>
              <div className="hev-text">
                <div className="hev-lbl">{slide.meta}</div>
                <div className="hev-title">{slide.title}</div>
                {slide.excerpt && <div className="hev-desc">{slide.excerpt}</div>}
              </div>
            </div>
          ))}
          <div className="hev-item hev-item--date">
            <div className="hev-date-big">{nextSabbath()}</div>
            <div className="hev-date-sub">{t('nextService')}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
