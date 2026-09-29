import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

// Same page as apps/web's not-found (styles in @sdarm/ui not-found.css). The
// navbar and footer come from the [locale] layout; the only way back offered
// is this app's own home.
export default async function NotFound() {
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
    <div className="nf-page">
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
        </nav>
      </div>
    </div>
  );
}
