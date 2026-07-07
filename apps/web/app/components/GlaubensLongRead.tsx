'use client';

import { useEffect, useRef, useState } from 'react';

interface DetailBlock {
  text: string;
  refs?: string;
}

export interface GlaubensArticle {
  num: string;
  navLabel: string;
  titlePrefix: string;
  accent: string;
  titleSuffix?: string;
  body: string;
  refs: string;
  detail?: DetailBlock[];
}

interface Props {
  articles: GlaubensArticle[];
  ariaNav: string;
  ariaOpen: string;
  ariaClose: string;
}

export default function GlaubensLongRead({ articles, ariaNav, ariaOpen, ariaClose }: Props) {
  const firstNum = articles[0]?.num ?? '01';
  const [activeNum, setActiveNum] = useState(firstNum);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const articleRefs = useRef<Map<string, HTMLElement>>(new Map());
  const detailInnerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveNum(entry.target.getAttribute('data-num') ?? firstNum);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );
    articleRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [articles, firstNum]);

  function scrollTo(num: string) {
    const el = articleRefs.current.get(num);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function toggle(num: string) {
    setExpanded((prev) => {
      const alreadyOpen = prev.has(num);
      if (!alreadyOpen) {
        prev.forEach((openNum) => {
          const innerEl = detailInnerRefs.current.get(openNum);
          const articleEl = articleRefs.current.get(openNum);
          if (innerEl && articleEl) {
            const articleBottom = articleEl.getBoundingClientRect().bottom;
            if (articleBottom <= 0) {
              window.scrollBy({ top: -innerEl.offsetHeight, behavior: 'instant' as ScrollBehavior });
            }
          }
        });
        return new Set([num]);
      } else {
        return new Set<string>();
      }
    });
  }

  return (
    <section className="glr-section">
      <div className="glr-body">
        {/* Sticky left nav */}
        <nav className="glr-nav" aria-label={ariaNav}>
          {articles.map((a) => (
            <button
              key={a.num}
              className={`glr-nav__item${activeNum === a.num ? ' glr-nav__item--active' : ''}`}
              onClick={() => scrollTo(a.num)}
              title={a.navLabel}
            >
              <span className="glr-nav__num">{a.num}</span>
              <span className="glr-nav__label">{a.navLabel}</span>
            </button>
          ))}
        </nav>

        {/* Articles */}
        <div className="glr-list">
          {articles.map((a) => {
            const isOpen = expanded.has(a.num);
            return (
              <article
                key={a.num}
                className="glr-item"
                data-num={a.num}
                id={`glr-${a.num}`}
                ref={(el) => {
                  if (el) articleRefs.current.set(a.num, el);
                  else articleRefs.current.delete(a.num);
                }}
              >
                <div className="glr-item__header">
                  <div className="glr-item__num">{a.num}</div>
                  <h2 className="glr-item__title">
                    {a.titlePrefix}
                    <em>{a.accent}</em>
                    {a.titleSuffix}
                  </h2>
                </div>
                <p className="glr-item__body">{a.body}</p>
                <p className="glr-item__refs">{a.refs}</p>

                {a.detail && a.detail.length > 0 && (
                  <>
                    <button
                      className={`glr-item__trigger${isOpen ? ' glr-item__trigger--open' : ''}`}
                      onClick={() => toggle(a.num)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? ariaClose : ariaOpen}
                    >
                      <svg className="glr-item__trigger-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <line
                          x1="12"
                          y1="4"
                          x2="12"
                          y2="20"
                          stroke="currentColor"
                          strokeWidth="0.9"
                          strokeLinecap="round"
                        />
                        <line
                          x1="4"
                          y1="12"
                          x2="20"
                          y2="12"
                          stroke="currentColor"
                          strokeWidth="0.9"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>

                    <div className={`glr-item__detail${isOpen ? ' glr-item__detail--open' : ''}`}>
                      <div
                        className="glr-item__detail__inner"
                        ref={(el) => {
                          if (el) detailInnerRefs.current.set(a.num, el);
                          else detailInnerRefs.current.delete(a.num);
                        }}
                      >
                        <div className="glr-item__detail__content">
                          {a.detail.map((block, i) => (
                            <div key={i} className="glr-item__detail-block">
                              <p className="glr-item__body">{block.text}</p>
                              {block.refs && <p className="glr-item__refs">{block.refs}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
