'use client';

import { useTranslations } from 'next-intl';
import type { TreasureType } from '../lib/api';

export type Language = 'all' | 'ru' | 'de' | 'en';
export type CategoryFilter = TreasureType | 'all';

interface Props {
  activeCategory: CategoryFilter;
  activeLang: Language;
  availableCategories: TreasureType[];
  availableLanguages: Language[];
  onCategoryChange: (c: CategoryFilter) => void;
  onLangChange: (l: Language) => void;
}

export default function TreasuresFilterBar({
  activeCategory,
  activeLang,
  availableCategories,
  availableLanguages,
  onCategoryChange,
  onLangChange,
}: Props) {
  const t = useTranslations('treasures.catalog');

  return (
    <div className="filter-section">
      <div className="filter-bar">
        <div className="filter-group">
          <button
            className={`filter-pill${activeCategory === 'all' ? ' active' : ''}`}
            onClick={() => onCategoryChange('all')}
          >
            {t('filterAll')}
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              className={`filter-pill${activeCategory === cat ? ' active' : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              {t(`type.${cat}`)}
            </button>
          ))}
        </div>

        <div className="filter-sep" />

        <div className="filter-group">
          <button className={`filter-pill${activeLang === 'all' ? ' active' : ''}`} onClick={() => onLangChange('all')}>
            {t('lang.all')}
          </button>
          {availableLanguages.map((l) => (
            <button
              key={l}
              className={`filter-pill${activeLang === l ? ' active' : ''}`}
              onClick={() => onLangChange(l)}
            >
              {t(`lang.${l}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
