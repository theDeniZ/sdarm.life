import { setRequestLocale } from 'next-intl/server';
import { ConnectedFooter } from '@sdarm/ui';
import TreasureCatalog from '../components/TreasureCatalog';
import { TREASURES } from '../lib/api';

export const runtime = 'edge';

export default async function TreasuresPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <TreasureCatalog treasures={TREASURES} />
      <ConnectedFooter locale={locale} />
    </>
  );
}
