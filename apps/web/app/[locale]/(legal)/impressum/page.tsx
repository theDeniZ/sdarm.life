import { getTranslations, setRequestLocale } from 'next-intl/server';

export const runtime = 'edge';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.legal.impressum' });
  return { title: t('metaTitle') };
}

export default async function ImpressumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('web.legal.impressum');

  return (
    <main className="page legal-page">
      <h1>{t('title')}</h1>

      <h2>{t('section1Title')}</h2>
      <p style={{ whiteSpace: 'pre-line' }}>{t('section1Body')}</p>

      <h2>{t('section2Title')}</h2>
      <p>
        E-Mail: <a href="mailto:info@sdarm.life">info@sdarm.life</a>
        <br />
        Website: <a href="https://sdarm.life">sdarm.life</a>
      </p>

      <h2>{t('section3Title')}</h2>
      <p style={{ whiteSpace: 'pre-line' }}>{t('section3Body')}</p>

      <h2>{t('section4Title')}</h2>
      <p style={{ whiteSpace: 'pre-line' }}>{t('section4Body')}</p>

      <h2>{t('section5Title')}</h2>
      <p>
        {t('section5Body')}
        <br />
        <a href="https://www.sdarm.org" target="_blank" rel="noopener noreferrer">
          www.sdarm.org
        </a>
      </p>
    </main>
  );
}
