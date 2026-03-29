'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHero } from '@sdarm/ui';
import type { Treasure, TreasureType } from '../lib/api';
import TreasuresFilterBar, { type CategoryFilter, type Language } from './TreasuresFilterBar';
import TreasureCard from './TreasureCard';
import BookRequestModal from './BookRequestModal';

const LIMIT = 20;

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

export default function TreasureCatalog({ apiUrl }: { apiUrl: string }) {
  const tBr = useTranslations('treasures.bookRequest');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [lang, setLang] = useState<Language>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [items, setItems] = useState<Treasure[]>([]);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Mutable state for use inside observers and async closures
  const filtersRef = useRef({ category: 'all' as CategoryFilter, lang: 'all' as Language });
  const offsetRef = useRef(0);
  const totalRef = useRef(0);
  const loadingRef = useRef(false);

  // Always points to the latest loadMore — updated every render
  const loadMoreRef = useRef<(reset?: boolean) => void>(() => {});

  async function loadMore(reset = false) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const { category: cat, lang: lng } = filtersRef.current;
    const off = reset ? 0 : offsetRef.current;
    if (reset) offsetRef.current = 0;

    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (lng !== 'all') params.set('language', lng);
      if (cat !== 'all') params.set('type', cat);
      const res = await fetch(`${apiUrl}/treasures?${params}`);
      if (res.ok) {
        const data = (await res.json()) as { items: Treasure[]; total: number };
        setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
        totalRef.current = data.total;
        offsetRef.current = off + data.items.length;
      }
    } catch {
      // Ignore errors for now — could add retry logic or error state if desired
    }

    loadingRef.current = false;
    setLoading(false);
  }

  loadMoreRef.current = loadMore;

  // Initial load
  useEffect(() => {
    loadMoreRef.current(true);
  }, []);

  // Sentinel observer — set up once, reads latest state from refs
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current && offsetRef.current < totalRef.current) {
          loadMoreRef.current(false);
        }
      },
      { rootMargin: '400px' }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  // Stagger reveal for newly added cards
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.item-card:not(.visible)'));
    if (!cards.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement;
            const idx = cards.indexOf(card);
            setTimeout(() => card.classList.add('visible'), idx * 55);
            obs.unobserve(card);
          }
        });
      },
      { threshold: 0.06 }
    );
    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [items]);

  function handleCategoryChange(cat: CategoryFilter) {
    filtersRef.current.category = cat;
    setCategory(cat);
    setItems([]);
    loadMoreRef.current(true);
  }

  function handleLangChange(lng: Language) {
    filtersRef.current.lang = lng;
    setLang(lng);
    setItems([]);
    loadMoreRef.current(true);
  }

  // Derive available categories and languages from loaded items
  const availableCategories = items.length
    ? ([...new Set(items.map((tr) => tr.type))] as TreasureType[])
    : (['book'] as TreasureType[]);
  const availableLanguages = items.length
    ? ([...new Set(items.map((tr) => tr.language))] as Language[])
    : (['de'] as Language[]);

  return (
    <>
      <PageHero
        title={tBr('bannerTitle')}
        centered
        cta={
          <button className="br-hero-cta" onClick={() => setModalOpen(true)}>
            {tBr('cta')}
            <svg viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="1" y1="8" x2="8" y2="1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <polyline
                points="3,1 8,1 8,6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        }
      />

      <BookRequestModal open={modalOpen} onClose={() => setModalOpen(false)} apiUrl={apiUrl} />

      <TreasuresFilterBar
        activeCategory={category}
        activeLang={lang}
        availableCategories={availableCategories}
        availableLanguages={availableLanguages}
        onCategoryChange={handleCategoryChange}
        onLangChange={handleLangChange}
      />

      <section className="shop-section">
        <div className="shop-grid" ref={gridRef}>
          {items.map((tr) => (
            <TreasureCard key={tr.id} treasure={tr} />
          ))}
        </div>

        {loading && (
          <div className="shop-loading">
            <div className="shop-spinner" />
          </div>
        )}

        <div ref={sentinelRef} />
      </section>

      <ScriptureQuote />
    </>
  );
}
