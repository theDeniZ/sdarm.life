import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { TREASURES } from '../../../lib/api';
import EpubReader from '../../../components/EpubReader';

export const runtime = 'edge';

export default async function BookPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const treasure = TREASURES.find((t) => t.id === Number(id) && t.type === 'book');
  if (!treasure || !treasure.epubUrl) notFound();

  return <EpubReader epubUrl={treasure.epubUrl} title={treasure.title} author={treasure.author} />;
}
