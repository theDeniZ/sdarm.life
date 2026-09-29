import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ComingSoon, siteHomeMetadata } from '@sdarm/ui';
import { API, SITE_URL } from '../lib/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'events.metadata' });
  return siteHomeMetadata({
    app: 'events',
    base: SITE_URL,
    api: API,
    locale,
    title: t('title'),
    description: t('description'),
  });
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('events');
  return <ComingSoon title={t('comingSoonTitle')} subtitle={t('comingSoonSubtitle')} />;
}
