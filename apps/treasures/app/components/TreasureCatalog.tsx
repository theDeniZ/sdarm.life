'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHero } from '@sdarm/ui';
import type { Treasure, TreasureType } from '../lib/api';
import TreasuresFilterBar, { type CategoryFilter, type Language } from './TreasuresFilterBar';
import TreasureCard from './TreasureCard';

const BOOK_DECORATION = (
  <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="5" width="44" height="62" rx="2" stroke="rgba(201,169,110,0.9)" strokeWidth="2" />
    <line x1="8" y1="5" x2="8" y2="67" stroke="rgba(201,169,110,0.9)" strokeWidth="4" />
    <line x1="18" y1="22" x2="46" y2="22" stroke="rgba(201,169,110,0.9)" strokeWidth="1.5" />
    <line x1="18" y1="30" x2="46" y2="30" stroke="rgba(201,169,110,0.9)" strokeWidth="1.5" />
    <line x1="18" y1="38" x2="38" y2="38" stroke="rgba(201,169,110,0.9)" strokeWidth="1.5" />
  </svg>
);

function ScriptureQuote() {
  const t = useTranslations('treasures.catalog');
  return (
    <div className="schaetze-quote">
      <div className="schaetze-quote-mark">&ldquo;</div>
      <div className="schaetze-quote-body">
        <p className="schaetze-quote-text">{t('scriptureText')}</p>
        <span className="schaetze-quote-source">{t('scriptureRef')}</span>
      </div>
    </div>
  );
}

export default function TreasureCatalog({ treasures }: { treasures: Treasure[] }) {
  const t = useTranslations('treasures.catalog');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [lang, setLang] = useState<Language>('all');
  const gridRef = useRef<HTMLDivElement>(null);

  const availableCategories = [...new Set(treasures.map((t) => t.type))] as TreasureType[];

  const filtered = treasures.filter(
    (tr) => (category === 'all' || tr.type === category) && (lang === 'all' || tr.language === lang)
  );

  // Stagger scroll-reveal on filter change
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.item-card'));
    cards.forEach((c) => c.classList.remove('visible'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement;
            const idx = cards.indexOf(card);
            setTimeout(() => card.classList.add('visible'), idx * 55);
            observer.unobserve(card);
          }
        });
      },
      { threshold: 0.06 }
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [filtered]);

  return (
    <>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t.rich('title', { em: (chunks) => <em>{chunks}</em> })}
        subtitle={t('subtitle')}
        decoration={BOOK_DECORATION}
        scrollHint={t('discover')}
      />

      <TreasuresFilterBar
        activeCategory={category}
        activeLang={lang}
        availableCategories={availableCategories}
        onCategoryChange={setCategory}
        onLangChange={setLang}
      />

      <section className="shop-section">
        <div className="shop-grid" ref={gridRef}>
          {filtered.map((tr) => (
            <TreasureCard key={tr.id} treasure={tr} />
          ))}
        </div>
      </section>

      <ScriptureQuote />
    </>
  );
}
