import { setRequestLocale } from 'next-intl/server';
import TreasureCatalog from '../components/TreasureCatalog';

export default async function TreasuresPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TreasureCatalog apiUrl={process.env.API_URL ?? 'https://api.sdarm.life/api/v1'} />;
}
