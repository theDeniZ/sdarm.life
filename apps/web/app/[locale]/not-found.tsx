export const runtime = 'edge';

import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ConnectedFooter } from '@sdarm/ui';

export default async function NotFound() {
  // not-found is rendered at the [locale] boundary, so getLocale() resolves
  // to the active request locale; defaulted to 'de' if the request is outside
  // an active locale segment.
  let locale = 'de';
  try {
    locale = await getLocale();
  } catch {
    // keep default
  }
  const t = await getTranslations({ locale, namespace: 'common.notFound' });
  const eyebrow = t('eyebrow');
  const eyebrowText = eyebrow.startsWith('404') ? eyebrow.replace(/^404\s*[·•]\s*/, '') : eyebrow;

  return (
    <>
      <main className="nf-page">
        <div className="nf-container">
          <div className="nf-number" aria-hidden="true">
            404
          </div>
          <p className="nf-eyebrow">{eyebrowText}</p>
          <h1 className="nf-title">{t.rich('title', { em: (chunks) => <em>{chunks}</em> })}</h1>

          <blockquote className="nf-verse">
            <p>«&nbsp;{t('verseText')}&nbsp;»</p>
            <cite>— {t('verseRef')}</cite>
          </blockquote>

          <p className="nf-back-prompt">{t('backPrompt')}</p>
          <nav className="nf-links">
            <Link href={`/${locale}`}>{t('homeLink')}</Link>
            <Link href={`/${locale}/about`}>{t('aboutLink')}</Link>
            <Link href={`/${locale}/kontakt`}>{t('kontaktLink')}</Link>
          </nav>
        </div>
      </main>
      <ConnectedFooter locale={locale} />
    </>
  );
}
