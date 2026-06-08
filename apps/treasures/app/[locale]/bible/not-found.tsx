import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function BibleNotFound() {
  const t = useTranslations('treasures.bible');
  const locale = useLocale();
  return (
    <div className="bible-notfound">
      <h1 className="bible-notfound-title">{t('notFoundTitle')}</h1>
      <p className="bible-notfound-body">{t('notFoundBody')}</p>
      <Link href={`/${locale}/bible`} className="bible-notfound-link">
        {t('homeLink')} →
      </Link>
    </div>
  );
}
