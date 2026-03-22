import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { fetchTreasureById } from '../../../lib/api';
import EpubReader from '../../../components/EpubReader';

export const runtime = 'edge';

export default async function BookPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const treasure = await fetchTreasureById(Number(id));
  if (!treasure || treasure.type !== 'book' || !treasure.epubUrl) notFound();

  return <EpubReader epubUrl={treasure.epubUrl} title={treasure.title} author={treasure.author} />;
}
