'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { r2url, type Treasure } from '../lib/api';
import Book3DCover from './Book3DCover';
import BookRequestModal from './BookRequestModal';

interface Props {
  treasure: Treasure;
  apiUrl: string;
}

export default function BookDetail({ treasure, apiUrl }: Props) {
  const locale = useLocale();
  const tBr = useTranslations('treasures.bookRequest');
  const [modalOpen, setModalOpen] = useState(false);
  const coverUrl = r2url(treasure.coverKey, { w: 600, q: 90 });

  return (
    <article className="book-detail">
      <Link href={`/${locale}`} className="book-detail__back" aria-label="Back">
        ←
      </Link>

      <div className="book-detail__layout">
        <div className="book-detail__cover">
          <Book3DCover
            src={coverUrl}
            alt={treasure.title}
            title={treasure.title}
            accentColor={treasure.coverAccentColor}
            gradient={treasure.coverGradient}
          />
        </div>

        <div className="book-detail__meta">
          <h1 className="book-detail__title">{treasure.title}</h1>
          {treasure.author && <p className="book-detail__author">{treasure.author}</p>}
          {treasure.description && <p className="book-detail__desc">{treasure.description}</p>}

          <button className="br-hero-cta" type="button" onClick={() => setModalOpen(true)}>
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
        </div>
      </div>

      <BookRequestModal open={modalOpen} onClose={() => setModalOpen(false)} apiUrl={apiUrl} />
    </article>
  );
}
