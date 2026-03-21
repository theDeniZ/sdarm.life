'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export interface Product {
  id: string;
  imageUrl: string;
  imageAlt: string;
  category: string;
  tag: string;
  title: string;
  description: string;
  meta: string;
  href?: string;
}

function isUnoptimized(url: string) {
  return url.startsWith('https://upload.wikimedia.org') || url.startsWith('https://images.unsplash.com');
}

export default function ProductsSection({ products: productsProp }: { products?: Product[] }) {
  const t = useTranslations('web.products');
  const tItems = useTranslations('web.products.items');

  const staticProducts: Product[] = [
    {
      id: '1',
      imageUrl: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=800&q=85&fit=crop',
      imageAlt: tItems('1.imageAlt'),
      category: tItems('1.category'),
      tag: tItems('1.tag'),
      title: tItems('1.title'),
      description: tItems('1.description'),
      meta: tItems('1.meta'),
    },
    {
      id: '2',
      imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=85&fit=crop',
      imageAlt: tItems('2.imageAlt'),
      category: tItems('2.category'),
      tag: tItems('2.tag'),
      title: tItems('2.title'),
      description: tItems('2.description'),
      meta: tItems('2.meta'),
    },
  ];

  const products = productsProp ?? staticProducts;
  const [idx, setIdx] = useState(0);
  const N = products.length;
  if (N === 0) return null;
  const p = products[idx];
  const categories = [...new Set(products.map((pr) => pr.category))];

  return (
    <section className="prod-banner-section" id="produkte">
      <div className="prod-banner-header">
        <h2 className="prod-banner-title">{t('title')}</h2>
      </div>

      <div className="prod-banner-stage">
        {/* Left: category tabs */}
        <div className="prod-cats">
          {categories.map((cat) => {
            const catIdx = products.findIndex((pr) => pr.category === cat);
            return (
              <div
                key={cat}
                className={`prod-cat${products[idx].category === cat ? ' active' : ''}`}
                onClick={() => setIdx(catIdx)}
              >
                {cat}
              </div>
            );
          })}
        </div>

        {/* Center: image */}
        <div className="prod-img-wrap">
          <div className="prod-img-bg">
            <Image
              src={p.imageUrl}
              alt={p.imageAlt}
              fill
              style={{ objectFit: 'cover' }}
              unoptimized={isUnoptimized(p.imageUrl)}
            />
          </div>
          <div className="prod-img-num">/{String(idx + 1).padStart(2, '0')}</div>
        </div>

        {/* Right: text */}
        <div className="prod-text-panel">
          <div className="prod-text-tag">{p.tag}</div>
          <h3 className="prod-text-name">{p.title}</h3>
          <p className="prod-text-desc">{p.description}</p>
          <div className="prod-text-meta">{p.meta}</div>
          {p.href && (
            <a href={p.href} className="prod-text-btn" target="_blank" rel="noopener noreferrer">
              {t('viewNow')}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <line x1="2" y1="8" x2="13" y2="8" />
                <polyline points="9,4 13,8 9,12" />
              </svg>
            </a>
          )}
        </div>

        {/* Bottom right: counter + arrows */}
        <div className="prod-nav">
          <span className="prod-counter">
            {idx + 1} / {N}
          </span>
          <button className="prod-arrow" onClick={() => setIdx((idx - 1 + N) % N)} aria-label={t('prevAria')}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="9,2 4,7 9,12" />
            </svg>
          </button>
          <button className="prod-arrow" onClick={() => setIdx((idx + 1) % N)} aria-label={t('nextAria')}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="5,2 10,7 5,12" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
