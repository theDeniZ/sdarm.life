'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { Treasure } from '../lib/api';

function Book3D({ treasure }: { treasure: Treasure }) {
  return (
    <div className="book-3d">
      <div
        className="book-3d-cover"
        style={{ background: treasure.coverGradient ?? undefined, borderColor: treasure.coverAccentColor ? `${treasure.coverAccentColor}38` : undefined }}
      >
        <div
          className="book-3d-spine"
          style={{
            background: treasure.coverAccentColor
              ? `linear-gradient(to bottom, ${treasure.coverAccentColor}80, ${treasure.coverAccentColor}2e, ${treasure.coverAccentColor}80)`
              : undefined,
          }}
        />
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
  const locale = useLocale();

  const LANG_LABEL: Record<string, string> = { ru: 'RU', de: 'DE', en: 'EN' };
  const readerHref = treasure.epubUrl ? `/${locale}/books/${treasure.id}` : null;

  const cta = readerHref ? (
    <Link href={readerHref} className="item-cta">
      {t('readSoon')}
      <svg viewBox="0 0 9 9">
        <line x1="1" y1="8" x2="8" y2="1" />
        <polyline points="3,1 8,1 8,6" />
      </svg>
    </Link>
  ) : (
    <span className="item-cta item-cta--disabled">
      {t('readSoon')}
      <svg viewBox="0 0 9 9">
        <line x1="1" y1="8" x2="8" y2="1" />
        <polyline points="3,1 8,1 8,6" />
      </svg>
    </span>
  );

  return (
    <div className="item-card">
      <div className="item-visual book-visual">
        {treasure.isFree && <div className="item-badge free-badge">{t('free')}</div>}
        <Book3D treasure={treasure} />
      </div>

      <div className="item-body">
        <div className="item-cat">
          {t(`type.${treasure.type}`)}
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '0.7rem',
              color: 'rgba(201,169,110,0.25)',
              letterSpacing: '0.08em',
            }}
          >
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
          {cta}
        </div>
      </div>
    </div>
  );
}
