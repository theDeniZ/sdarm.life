import type { MetadataRoute } from 'next';

const BASE = 'https://sdarm.life';
const LOCALES = ['de', 'en'] as const;

async function fetchAllPosts(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    const res = await fetch('https://api.sdarm.life/api/v1/posts?limit=500', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: { slug: string; updatedAt: string }[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchAllPosts();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    ...LOCALES.map((l) => ({
      url: `${BASE}/${l}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    })),
    ...LOCALES.map((l) => ({
      url: `${BASE}/${l}/about`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...LOCALES.map((l) => ({
      url: `${BASE}/${l}/kontakt`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...LOCALES.map((l) => ({ url: `${BASE}/${l}/impressum`, changeFrequency: 'yearly' as const, priority: 0.2 })),
    ...LOCALES.map((l) => ({ url: `${BASE}/${l}/datenschutz`, changeFrequency: 'yearly' as const, priority: 0.2 })),
  ];

  const postPages: MetadataRoute.Sitemap = posts.flatMap((post) =>
    LOCALES.map((locale) => ({
      url: `${BASE}/${locale}/posts/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  );

  return [...staticPages, ...postPages];
}
