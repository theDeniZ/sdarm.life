'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { r2url, type Treasure } from '../lib/api';
import Book3DCover from './Book3DCover';

const LANG_LABEL: Record<string, string> = { ru: 'RU', de: 'DE', en: 'EN' };

export default function TreasureCard({ treasure }: { treasure: Treasure }) {
  const locale = useLocale();

  const detailHref = `/${locale}/books/${treasure.id}`;
  const coverUrl = r2url(treasure.coverKey, { w: 200, q: 85 });

  return (
    <Link href={detailHref} className="item-card">
      <div className="item-visual book-visual">
        <Book3DCover
          src={coverUrl}
          alt={treasure.title}
          title={treasure.title}
          accentColor={treasure.coverAccentColor}
          gradient={treasure.coverGradient}
        />
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
    </Link>
  );
}
