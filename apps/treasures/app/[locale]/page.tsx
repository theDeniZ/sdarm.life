import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ComingSoon } from '@sdarm/ui';

export const runtime = 'edge';

export default async function TreasuresPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('treasures');
  return <ComingSoon title={t('comingSoonTitle')} subtitle={t('comingSoonSubtitle')} />;
}
