import type { MetadataRoute } from 'next';
import { API } from './lib/api';
import type { Treasure } from './lib/api';
import { fetchBooks, fetchTranslations } from './lib/bible';

const BASE = 'https://treasures.sdarm.life';
const LOCALES = ['de', 'en'] as const;

async function fetchTreasures(): Promise<Treasure[]> {
  try {
    const res = await fetch(`${API}/treasures?limit=500`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: Treasure[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [treasures, translations] = await Promise.all([fetchTreasures(), fetchTranslations()]);
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = LOCALES.flatMap((l) => [
    { url: `${BASE}/${l}`, lastModified: now, changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${BASE}/${l}/bible`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
  ]);

  // Book treasure detail pages
  const bookPages: MetadataRoute.Sitemap = treasures
    .filter((t) => t.type === 'book' && t.epubUrl)
    .flatMap((t) =>
      LOCALES.map((l) => ({
        url: `${BASE}/${l}/books/${t.id}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
    );

  /* Bible: translation landings and book indexes only — deliberately not the
     chapters. Listing every chapter of every book of every translation in both
     locales came to some 2,400 URLs per translation, and each of those pages is
     a Worker invocation that fans out to the API Worker, so a single crawler
     reading this file could spend the account's whole daily request budget. The
     chapter pages are still linked from each book index and still indexable —
     a crawler reaches them at its own pace instead of being handed the entire
     tree at once. */
  const allBooks = await Promise.all(translations.map(async (tr) => ({ tr, books: await fetchBooks(tr.code) })));

  const biblePages: MetadataRoute.Sitemap = allBooks.flatMap(({ tr, books }) => {
    const translationLanding = LOCALES.map((l) => ({
      url: `${BASE}/${l}/bible/${tr.code}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    }));
    const bookIndexes = books.flatMap((b) =>
      LOCALES.map((l) => ({
        url: `${BASE}/${l}/bible/${tr.code}/${b.code}`,
        lastModified: now,
        changeFrequency: 'yearly' as const,
        priority: 0.6,
      }))
    );
    return [...translationLanding, ...bookIndexes];
  });

  return [...staticPages, ...bookPages, ...biblePages];
}
