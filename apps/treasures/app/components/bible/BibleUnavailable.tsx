'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

interface Props {
  translationCode: string;
  bookCode: string;
  bookName: string;
  chapter: number;
}

export default function BibleUnavailable({ translationCode, bookCode, bookName, chapter }: Props) {
  const t = useTranslations('treasures.bible');
  const locale = useLocale();
  return (
    <div className="bible-unavailable" role="alert">
      <h1 className="bible-unavailable-title">{t('unavailableTitle')}</h1>
      <p className="bible-unavailable-body">{t('unavailableBody', { reference: `${bookName} ${chapter}` })}</p>
      <div className="bible-unavailable-actions">
        <button
          type="button"
          className="bible-unavailable-btn bible-unavailable-btn--primary"
          onClick={() => window.location.reload()}
        >
          {t('retry')}
        </button>
        <Link href={`/${locale}/bible/${translationCode}/${bookCode}`} className="bible-unavailable-btn">
          {bookName}
        </Link>
        <Link href={`/${locale}/bible`} className="bible-unavailable-btn">
          {t('homeLink')}
        </Link>
      </div>
    </div>
  );
}
