import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { siteHomeMetadata } from '@sdarm/ui';
import TreasureCatalog from '../../components/TreasureCatalog';
import { API, SBL, SITE_URL } from '../../lib/api';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'treasures.metadata' });
  return siteHomeMetadata({
    app: 'treasures',
    base: SITE_URL,
    api: API,
    locale,
    title: t('title'),
    description: t('description'),
  });
}

export default async function TreasuresPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <TreasureCatalog
      apiUrl={process.env.API_URL ?? 'https://api.sdarm.life/api/v1'}
      r2Url={process.env.R2_URL ?? 'https://images.sdarm.life'}
      sblUrl={SBL}
    />
  );
}
