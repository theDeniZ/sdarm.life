import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { fetchTreasureById } from '../../../lib/api';
import EpubReader from '../../../components/EpubReader';
import BookDetail from '../../../components/BookDetail';

export default async function BookPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const treasure = await fetchTreasureById(Number(id));
  if (!treasure || treasure.type !== 'book') notFound();

  if (treasure.epubUrl) {
    return <EpubReader epubUrl={treasure.epubUrl} title={treasure.title} author={treasure.author} />;
  }

  return <BookDetail treasure={treasure} apiUrl={process.env.API_URL ?? 'https://api.sdarm.life/api/v1'} />;
}
