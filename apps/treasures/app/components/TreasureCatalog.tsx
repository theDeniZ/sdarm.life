'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { PageHero } from '@sdarm/ui';
import type { Treasure, TreasureType } from '../lib/api';
import TreasuresFilterBar, { type CategoryFilter, type Language } from './TreasuresFilterBar';
import TreasureCard from './TreasureCard';
import BookRequestModal from './BookRequestModal';

const PAGE_SIZE = 8; // 2–3 rows × 3 columns

function pageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (left > 2) pages.push('ellipsis');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

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

const BANNER_KEY = 'uploads/998516df-c8b7-4492-a11f-7785412673d6.png';

export default function TreasureCatalog({
  apiUrl,
  r2Url = 'https://images.sdarm.life',
}: {
  apiUrl: string;
  r2Url?: string;
}) {
  const tBr = useTranslations('treasures.bookRequest');
  const locale = useLocale();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [lang, setLang] = useState<Language>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [items, setItems] = useState<Treasure[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const initializedRef = useRef(false);

  const fetchPage = useCallback(
    async (pg: number, cat: CategoryFilter, lng: Language) => {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((pg - 1) * PAGE_SIZE) });
      if (cat !== 'all') params.set('type', cat);
      if (lng !== 'all') params.set('language', lng);
      try {
        const res = await fetch(`${apiUrl}/treasures?${params}`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { items: Treasure[]; total: number };
          setItems(data.items);
          setTotal(data.total);
        }
      } catch {
        // Silently swallow fetch errors; catalog renders with existing items
      }
      setLoading(false);
    },
    [apiUrl]
  );

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchPage(1, 'all', 'all');
    }
  }, [fetchPage]);

  // Stagger reveal when items change
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.item-card'));
    cards.forEach((c) => c.classList.remove('visible'));
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
    setCategory(cat);
    setPage(1);
    fetchPage(1, cat, lang);
  }

  function handleLangChange(lng: Language) {
    setLang(lng);
    setPage(1);
    fetchPage(1, category, lng);
  }

  function handlePageChange(pg: number) {
    setPage(pg);
    fetchPage(pg, category, lang);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const LANG_ORDER: Record<string, number> = { de: 0, en: 1 };
  const displayItems = items
    .filter((tr) => tr.language !== 'ru')
    .sort((a, b) => (LANG_ORDER[a.language] ?? 9) - (LANG_ORDER[b.language] ?? 9));

  // Categories are stable: always offer both "Bücher" and "Bibel" chips so the
  // filter is testable even if the first paginated page contains only one type.
  const availableCategories: TreasureType[] = ['book', 'bible'];
  // Languages still derived from loaded items (depends on actual content)
  const availableLanguages = displayItems.length
    ? ([...new Set(displayItems.map((tr) => tr.language))] as Language[])
    : (['de'] as Language[]);

  return (
    <>
      <div className="catalog-hero" style={{ backgroundImage: `url('${r2Url}/${BANNER_KEY}')` }}>
        <div className="catalog-hero__overlay" />
        <PageHero
          title={tBr('bannerTitle')}
          centered
          cta={
            <div className="br-hero-ctas">
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
              <Link href={`/${locale}/bible`} className="br-hero-cta br-hero-cta--ghost">
                {tBr('bibleCta')}
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
              </Link>
            </div>
          }
        />
      </div>

      <BookRequestModal open={modalOpen} onClose={() => setModalOpen(false)} apiUrl={apiUrl} />

      <TreasuresFilterBar
        activeCategory={category}
        activeLang={lang}
        availableCategories={availableCategories}
        availableLanguages={availableLanguages}
        onCategoryChange={handleCategoryChange}
        onLangChange={handleLangChange}
      />

      <section className="shop-section" ref={sectionRef}>
        {loading ? (
          <div className="shop-loading">
            <div className="shop-spinner" />
          </div>
        ) : (
          <div className="shop-grid" ref={gridRef}>
            {displayItems.map((tr) => (
              <TreasureCard key={tr.id} treasure={tr} />
            ))}
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className="shop-pagination" role="navigation" aria-label="Seitennavigation">
            <button
              className="shop-pg-btn"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Vorherige Seite"
            >
              ←
            </button>
            {pageRange(page, totalPages).map((item, i) =>
              item === 'ellipsis' ? (
                <span key={`e${i}`} className="shop-pg-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  className={`shop-pg-num${item === page ? ' active' : ''}`}
                  onClick={() => handlePageChange(item)}
                >
                  {item}
                </button>
              )
            )}
            <button
              className="shop-pg-btn"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Nächste Seite"
            >
              →
            </button>
          </div>
        )}
      </section>

      <ScriptureQuote />
    </>
  );
}
