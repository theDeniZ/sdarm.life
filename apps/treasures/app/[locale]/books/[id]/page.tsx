import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { fetchTreasureById, API } from '../../../lib/api';
import EpubReader from '../../../components/EpubReader';
import BookDetail from '../../../components/BookDetail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const treasure = await fetchTreasureById(Number(id));
  if (!treasure) return {};

  // KV TTL (24 h) bounds staleness — the Treasure DTO carries no updatedAt to cache-bust on.
  const ogImage = `${API}/og?type=treasure&id=${treasure.id}&locale=${locale}`;
  const description = treasure.author ?? treasure.description ?? undefined;

  return {
    title: treasure.title,
    description,
    openGraph: {
      type: 'book',
      title: treasure.title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: treasure.title }],
    },
  };
}

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
