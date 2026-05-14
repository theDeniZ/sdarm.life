import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ComingSoon } from '@sdarm/ui';

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('events');
  return <ComingSoon title={t('comingSoonTitle')} subtitle={t('comingSoonSubtitle')} />;
}
