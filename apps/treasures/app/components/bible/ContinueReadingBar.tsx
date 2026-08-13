'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { readLastRead, type BibleLastRead } from './lastRead';

export default function ContinueReadingBar() {
  const t = useTranslations('treasures.bible');
  const locale = useLocale();
  // Read localStorage only after mount — the SSR pass has no window, and an
  // initializer read would make server and client HTML disagree (hydration error).
  const [last, setLast] = useState<BibleLastRead | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLast(readLastRead());
  }, []);

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
