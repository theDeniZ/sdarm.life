'use client';

import { useTranslations } from 'next-intl';
import type { TreasureType } from '../lib/api';

export type Language = 'all' | 'ru' | 'de' | 'en';
export type CategoryFilter = TreasureType | 'all';

interface Props {
  activeCategory: CategoryFilter;
  activeLang: Language;
  availableCategories: TreasureType[];
  onCategoryChange: (c: CategoryFilter) => void;
  onLangChange: (l: Language) => void;
}

const LANGS: Language[] = ['all', 'ru', 'de', 'en'];

export default function TreasuresFilterBar({
  activeCategory,
  activeLang,
  availableCategories,
  onCategoryChange,
  onLangChange,
}: Props) {
  const t = useTranslations('treasures.catalog');

  return (
    <div className="filter-section">
      <div className="filter-bar">
        <span className="filter-label">{t('filterCategory')}</span>
        <button
          className={`filter-btn${activeCategory === 'all' ? ' active' : ''}`}
          onClick={() => onCategoryChange('all')}
        >
          {t('filterAll')}
        </button>
        {availableCategories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn${activeCategory === cat ? ' active' : ''}`}
            onClick={() => onCategoryChange(cat)}
          >
            {t(`type.${cat}`)}
          </button>
        ))}
      </div>

      <div className="filter-bar filter-bar-lang">
        <span className="filter-label">{t('filterLang')}</span>
        {LANGS.map((l) => (
          <button key={l} className={`lang-btn${activeLang === l ? ' active' : ''}`} onClick={() => onLangChange(l)}>
            {t(`lang.${l}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
