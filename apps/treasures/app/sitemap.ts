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
    /* weekly: the sheet shows the lesson of the current week, so the page a
       crawler fetched last Tuesday is not the page that is there today */
    { url: `${BASE}/${l}/sbl`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
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

  // Bible: translation landing + every chapter of every book × every locale
  const allBooks = await Promise.all(translations.map(async (tr) => ({ tr, books: await fetchBooks(tr.code) })));

  const biblePages: MetadataRoute.Sitemap = allBooks.flatMap(({ tr, books }) => {
    const translationLanding = LOCALES.map((l) => ({
      url: `${BASE}/${l}/bible/${tr.code}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    }));
    const chapters = books.flatMap((b) =>
      Array.from({ length: b.chapterCount }, (_, i) => i + 1).flatMap((n) =>
        LOCALES.map((l) => ({
          url: `${BASE}/${l}/bible/${tr.code}/${b.code}/${n}`,
          lastModified: now,
          changeFrequency: 'yearly' as const,
          priority: 0.6,
        }))
      )
    );
    return [...translationLanding, ...chapters];
  });

  return [...staticPages, ...bookPages, ...biblePages];
}
