'use client';

import { useTranslations } from 'next-intl';
import type { Treasure } from '../lib/api';

function Book3D({ treasure }: { treasure: Treasure }) {
  return (
    <div className="book-3d">
      <div
        className="book-3d-cover"
        style={{ background: treasure.coverGradient, borderColor: `${treasure.coverAccentColor}38` }}
      >
        <div className="book-3d-spine" style={{ background: `linear-gradient(to bottom, ${treasure.coverAccentColor}80, ${treasure.coverAccentColor}2e, ${treasure.coverAccentColor}80)` }} />
        <div className="book-3d-content">
          <div className="book-3d-cross">✦</div>
          <div className="book-3d-title">{treasure.title}</div>
          <div className="book-3d-line" />
          <div className="book-3d-author">{treasure.author}</div>
        </div>
      </div>
    </div>
  );
}

export default function TreasureCard({ treasure }: { treasure: Treasure }) {
  const t = useTranslations('treasures.catalog');

  const LANG_LABEL: Record<string, string> = { ru: 'RU', de: 'DE', en: 'EN' };

  return (
    <div className="item-card">
      <div className="item-visual book-visual">
        {treasure.isFree && (
          <div className="item-badge free-badge">{t('free')}</div>
        )}
        <Book3D treasure={treasure} />
      </div>

      <div className="item-body">
        <div className="item-cat">
          {t(`type.${treasure.type}`)}
          <span style={{ marginLeft: 'auto', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.7rem', color: 'rgba(201,169,110,0.25)', letterSpacing: '0.08em' }}>
            {LANG_LABEL[treasure.language]}
          </span>
        </div>
        <div className="item-title">{treasure.title}</div>
        {treasure.author && <div className="item-author">{treasure.author}</div>}
        {treasure.description && <div className="item-desc">{treasure.description}</div>}
        <div className="item-footer">
          <div className={`item-price${treasure.isFree ? ' free' : ''}`}>
            {treasure.isFree ? t('free') : treasure.price}
          </div>
          <span className="item-cta">
            {t('readSoon')}
            <svg viewBox="0 0 9 9"><line x1="1" y1="8" x2="8" y2="1" /><polyline points="3,1 8,1 8,6" /></svg>
          </span>
        </div>
      </div>
    </div>
  );
}
