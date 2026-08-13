'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { BibleBook } from '../../lib/bible';
import BiblePassagePicker, { type PassageTarget } from './BiblePassagePicker';

interface Props {
  locale: string;
  translationCode: string;
  books: BibleBook[];
}

type Section = 'all' | 'OT' | 'NT';

export default function BibleBookIndex({ locale, translationCode, books }: Props) {
  const t = useTranslations('treasures.bible');
  const router = useRouter();
  const [section, setSection] = useState<Section>('all');

  const filtered = useMemo(() => {
    return books.filter((b) => section === 'all' || b.testament === section);
  }, [books, section]);

  const ot = filtered.filter((b) => b.testament === 'OT');
  const nt = filtered.filter((b) => b.testament === 'NT');

  function handlePick(target: PassageTarget) {
    const verseSuffix = target.verse !== undefined ? `#v${target.verse}` : '';
    router.push(`/${locale}/bible/${translationCode}/${target.bookCode}/${target.chapter}${verseSuffix}`);
  }

  return (
    <section className="bible-book-index" aria-label={t('ariaBookList')}>
      <div className="bible-index-controls">
        <BiblePassagePicker books={books} onPick={handlePick} />
        <div className="bible-section-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={section === 'all'}
            className={`bible-section-tab${section === 'all' ? ' active' : ''}`}
            onClick={() => setSection('all')}
          >
            {t('books')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === 'OT'}
            className={`bible-section-tab${section === 'OT' ? ' active' : ''}`}
            onClick={() => setSection('OT')}
          >
            {t('oldTestament')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === 'NT'}
            className={`bible-section-tab${section === 'NT' ? ' active' : ''}`}
            onClick={() => setSection('NT')}
          >
            {t('newTestament')}
          </button>
        </div>
      </div>

      {filtered.length === 0 && <p className="bible-empty">{t('noBooksMatch')}</p>}

      {(section === 'all' || section === 'OT') && ot.length > 0 && (
        <div className="bible-book-section">
          <h3 className="bible-book-section-title">{t('oldTestament')}</h3>
          <BookList locale={locale} translationCode={translationCode} books={ot} />
        </div>
      )}

      {(section === 'all' || section === 'NT') && nt.length > 0 && (
        <div className="bible-book-section">
          <h3 className="bible-book-section-title">{t('newTestament')}</h3>
          <BookList locale={locale} translationCode={translationCode} books={nt} />
        </div>
      )}
    </section>
  );
}

function BookList({ locale, translationCode, books }: { locale: string; translationCode: string; books: BibleBook[] }) {
  return (
    <ul className="bible-book-list">
      {books.map((b) => (
        <li key={b.code}>
          <Link href={`/${locale}/bible/${translationCode}/${b.code}`} className="bible-book-link">
            <span className="bible-book-name">{b.name}</span>
            <span className="bible-book-meta">{b.chapterCount}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
