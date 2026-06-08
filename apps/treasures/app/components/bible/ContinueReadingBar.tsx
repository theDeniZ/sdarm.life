'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { readLastRead, type BibleLastRead } from './lastRead';

export default function ContinueReadingBar() {
  const t = useTranslations('treasures.bible');
  const locale = useLocale();
  const [last] = useState<BibleLastRead | null>(() => readLastRead());

  if (!last) return null;

  const href = `/${locale}/bible/${last.translationCode}/${last.bookCode}/${last.chapter}${
    last.verse ? `#v${last.verse}` : ''
  }`;

  return (
    <Link href={href} className="bible-continue">
      <div className="bible-continue-eyebrow">{t('continueReading')}</div>
      <div className="bible-continue-title">
        {last.translationName} · {last.bookName} {last.chapter}
        {last.verse ? `:${last.verse}` : ''}
      </div>
      <div className="bible-continue-cta" aria-hidden="true">
        {t('continueResume')} →
      </div>
    </Link>
  );
}
