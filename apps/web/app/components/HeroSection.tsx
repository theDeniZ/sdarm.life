'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

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

const TINTS = [
  'radial-gradient(ellipse at 62% 28%, rgba(90,62,28,0.32) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(40,22,8,0.45) 0%, transparent 50%)',
  'radial-gradient(ellipse at 62% 28%, rgba(28,50,80,0.30) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(10,22,40,0.40) 0%, transparent 50%)',
  'radial-gradient(ellipse at 62% 28%, rgba(70,40,18,0.28) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(30,14,6,0.40) 0%, transparent 50%)',
  'radial-gradient(ellipse at 62% 28%, rgba(22,36,60,0.28) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(10,18,32,0.40) 0%, transparent 50%)',
  'radial-gradient(ellipse at 62% 28%, rgba(55,32,14,0.28) 0%, transparent 58%), radial-gradient(ellipse at 15% 80%, rgba(28,12,4,0.38) 0%, transparent 50%)',
];

const INTERVAL = 5000;

function isUnoptimized(url: string) {
  return url.startsWith('https://upload.wikimedia.org') || url.startsWith('https://images.unsplash.com');
}

export default function HeroSection({ posts }: { posts?: HeroPost[] }) {
  const slides = posts?.length ? posts : [STATIC];
  const N = slides.length;

  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const [textVisible, setTextVisible] = useState(true);

  const activeRef = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leaveTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const textTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const goTo = useCallback((idx: number) => {
    const prev = activeRef.current;
    if (idx === prev) return;
    activeRef.current = idx;

    setLeaving(prev);
    const lt = setTimeout(() => setLeaving((lv) => (lv === prev ? null : lv)), 340);
    leaveTimers.current.push(lt);

    setActive(idx);

    requestAnimationFrame(() => {
      const wrap = stripRef.current;
      const card = cardRefs.current[idx];
      if (!wrap || !card) return;
      const wrapRect = wrap.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const target = wrap.scrollLeft + cardRect.left - wrapRect.left - (wrapRect.width - cardRect.width) / 2;
      wrap.scrollTo({ left: target, behavior: 'smooth' });
    });

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
      leaveTimers.current.forEach(clearTimeout);
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
          <div className="side-lbl">{post.meta || 'Reformation'}</div>
          <div className="side-cnt">
            {String(active + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
          </div>
        </div>

        <div className="hero-content">
          <h1 className={`hero-title${textVisible ? '' : ' fade-out'}`}>{post.title}</h1>
          {post.body && <p className={`hero-sub${textVisible ? '' : ' fade-out'}`}>{post.body}</p>}
        </div>

        <div className="strip-wrap" ref={stripRef}>
          <div className="strip">
            {slides.map((slide, i) => {
              const cls = ['card', active === i ? 'active' : '', leaving === i ? 'leaving' : '']
                .filter(Boolean)
                .join(' ');

              return (
                <div
                  key={slide.slug + i}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className={cls}
                  onClick={() => handleClick(i)}
                >
                  <div className="card-img">
                    <Image
                      src={slide.thumbUrl}
                      alt={slide.imageAlt}
                      fill
                      style={{ objectFit: 'cover' }}
                      unoptimized={isUnoptimized(slide.thumbUrl)}
                      priority={i === 0}
                    />
                  </div>
                  <div className="card-vl" />
                  <div className="card-vb" />
                  <div className="card-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="card-text">
                    <div className="card-title">{slide.excerpt || slide.title}</div>
                  </div>
                  <div className="card-prog">
                    {active === i && <div key={`fill-${active}`} className="card-prog-fill" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
