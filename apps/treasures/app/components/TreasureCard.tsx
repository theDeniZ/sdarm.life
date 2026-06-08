'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { Treasure } from '../lib/api';

function Book3D({ treasure }: { treasure: Treasure }) {
  return (
    <div className="book-3d">
      <div
        className="book-3d-cover"
        style={{
          background: treasure.coverGradient ?? undefined,
          borderColor: treasure.coverAccentColor ? `${treasure.coverAccentColor}38` : undefined,
        }}
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

const LANG_LABEL: Record<string, string> = { ru: 'RU', de: 'DE', en: 'EN' };

// Titles available as physical books via the book request form
const PHYSICAL_TITLES = new Set([
  'Das Leben Jesu',
  'Der Weg zu Christus',
  'Der große Kampf',
  'The Desire of Ages',
  'Steps to Christ',
  'The Great Controversy',
]);

export default function TreasureCard({ treasure }: { treasure: Treasure }) {
  const t = useTranslations('treasures.catalog');
  const locale = useLocale();

  const isBible = treasure.type === 'bible';
  const isPhysical = !isBible && PHYSICAL_TITLES.has(treasure.title);

  const href =
    isBible && treasure.bibleCode
      ? `/${locale}/bible/${treasure.bibleCode}`
      : treasure.epubUrl
        ? `/${locale}/books/${treasure.id}`
        : null;

  const inner = (
    <>
      <div className="item-visual book-visual">
        {isBible && <div className="item-badge bible-badge">{t('bibleBadge')}</div>}
        {isPhysical && <div className="item-badge post-badge">{t('postBadge')}</div>}
        <Book3D treasure={treasure} />
      </div>

      <div className="item-body">
        <div className="item-title-row">
          <div className="item-title">{treasure.title}</div>
          {LANG_LABEL[treasure.language] && <span className="item-lang">{LANG_LABEL[treasure.language]}</span>}
        </div>
        {treasure.author && <div className="item-author">{treasure.author}</div>}
        {treasure.description && <div className="item-desc">{treasure.description}</div>}
        {!treasure.isFree && <div className="item-price">{treasure.price}</div>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="item-card">
        {inner}
      </Link>
    );
  }

  return <div className="item-card item-card--no-link">{inner}</div>;
}
