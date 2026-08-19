import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.legal.datenschutz' });
  return { title: t('metaTitle') };
}

export default async function DatenschutzPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('web.legal.datenschutz');

  return (
    <main id="main-content" className="page legal-page">
      <h1>{t('title')}</h1>

      <h2>{t('section1Title')}</h2>
      <p>
        {t('section1Body').split('\n')[0]}
        <br />
        {t('section1Body').split('\n').slice(1).join('\n')}
        <br />
        E-Mail: <a href="mailto:info@sdarm.life">info@sdarm.life</a>
      </p>

      <h2>{t('section2Title')}</h2>
      <p>{t('section2Body')}</p>

      <h2>{t('section3Title')}</h2>
      <p>{t('section3Body')}</p>
      <p>{t('section3LocalStorage')}</p>

      <h2>{t('section4Title')}</h2>
      <p>
        {t('section4Body')}{' '}
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
          {t('cloudflarePrivacy')}
        </a>
        .
      </p>

      <h2>{t('section5Title')}</h2>
      <p>
        {t('section5Body')}{' '}
        <a href="https://whiteestate.org/legal-notice/privacy-policy/" target="_blank" rel="noopener noreferrer">
          {t('section5PrivacyLink')}
        </a>
        .
      </p>

      <h2>{t('section6Title')}</h2>
      <p>
        {t('section6Body')} <a href="mailto:info@sdarm.life">info@sdarm.life</a>.
      </p>

      <h2>{t('section8Title')}</h2>
      <p>
        {t('section8Body')}{' '}
        <a href="https://www.youversion.com/privacy/" target="_blank" rel="noopener noreferrer">
          {t('section8PrivacyLink')}
        </a>
        .
      </p>

      <h2>{t('section9Title')}</h2>
      <p>{t('section9Body')}</p>

      <h2>{t('section7Title')}</h2>
      <p>
        {t('section7Body')} <a href="mailto:info@sdarm.life">info@sdarm.life</a>.
      </p>
    </main>
  );
}
