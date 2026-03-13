'use client';

import { useState } from 'react';
import Image from 'next/image';

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

const STATIC_PRODUCTS: Product[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=800&q=85&fit=crop',
    imageAlt: 'Der Große Kampf',
    category: 'Bücher',
    tag: 'Klassiker',
    title: 'Der Große Kampf zwischen Christus und Satan',
    description:
      'Das umfassendste Werk über den Konflikt zwischen Gut und Böse — von der Zerstörung Jerusalems bis zur neuen Erde.',
    meta: 'Ellen G. White · Klassiker',
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=85&fit=crop',
    imageAlt: 'Schritte zu Christus',
    category: 'Bücher',
    tag: 'Weltweiter Bestseller',
    title: 'Schritte zu Christus — Weg zur persönlichen Gemeinschaft mit Gott',
    description: 'Das meistgelesene Buch von Ellen White — ein klarer, einfühlsamer Weg zu einem lebendigen Glauben.',
    meta: 'Ellen G. White · Weltweiter Bestseller',
  },
];

function isUnoptimized(url: string) {
  return url.startsWith('https://upload.wikimedia.org') || url.startsWith('https://images.unsplash.com');
}

export default function ProductsSection({ products = STATIC_PRODUCTS }: { products?: Product[] }) {
  const [idx, setIdx] = useState(0);
  const N = products.length;
  if (N === 0) return null;
  const p = products[idx];
  const categories = [...new Set(products.map((pr) => pr.category))];

  return (
    <section className="prod-banner-section" id="produkte">
      <div className="prod-banner-header">
        <h2 className="prod-banner-title">Neueste Produkte</h2>
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
              Jetzt ansehen
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
          <button className="prod-arrow" onClick={() => setIdx((idx - 1 + N) % N)} aria-label="Zurück">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="9,2 4,7 9,12" />
            </svg>
          </button>
          <button className="prod-arrow" onClick={() => setIdx((idx + 1) % N)} aria-label="Weiter">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="5,2 10,7 5,12" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
