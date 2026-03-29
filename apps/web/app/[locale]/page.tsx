import { setRequestLocale } from 'next-intl/server';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';
import HeroSection from '../components/HeroSection';
import NewsSection from '../components/NewsSection';
import ScriptureVerseSection from '../components/ScriptureVerseSection';
import { fetchPosts, fetchConfig, fetchTreasures, fetchSongbooks, toHeroPost, r2url } from '../lib/api';
import { formatDate } from '../lib/format';
import type { NewsData } from '../lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [featuredRaw, config, latestPosts, videoPost, bookRaw, songbooksRaw] = await Promise.all([
    fetchPosts('featured=1'),
    fetchConfig(),
    fetchPosts('limit=2'),
    fetchPosts('video=1&limit=1'),
    fetchTreasures('type=book&limit=1'),
    fetchSongbooks(),
  ]);
  const heroPosts = featuredRaw?.map(toHeroPost) ?? [];
  const heroBgUrl = r2url(config?.hero_bg_key ?? null, { w: 1920, q: 85 });

  const SONGBOOK_URL = process.env.SONGBOOK_URL ?? 'https://songbook.sdarm.life';
  const TREASURES_URL = process.env.TREASURES_URL ?? 'https://treasures.sdarm.life';
  const EVENTS_URL = process.env.EVENTS_URL ?? 'https://events.sdarm.life';

  const sermonPost = videoPost?.[0] ?? null;
  const studyPost = latestPosts?.find((p) => p.id !== sermonPost?.id) ?? latestPosts?.[0] ?? null;

  const newsData: NewsData = {
    book: bookRaw?.[0]
      ? { title: bookRaw[0].title, author: bookRaw[0].author, href: `${TREASURES_URL}/${locale}` }
      : null,
    song: songbooksRaw?.[0]
      ? { title: songbooksRaw[0].title, songCount: songbooksRaw[0].songCount, href: `${SONGBOOK_URL}/${locale}` }
      : null,
    sermon: sermonPost
      ? {
          title: sermonPost.title,
          author: sermonPost.author,
          date: formatDate(sermonPost.publishedAt),
          href: `/${locale}/posts/${sermonPost.slug}`,
        }
      : null,
    study: studyPost ? { title: studyPost.title, href: `/${locale}/posts/${studyPost.slug}` } : null,
    eventsUrl: `${EVENTS_URL}/${locale}`,
  };

  return (
    <>
      <ConnectedNavbar locale={locale} />
      <HeroSection posts={heroPosts} bgUrl={heroBgUrl} />
      <NewsSection newsData={newsData} />
      <ScriptureVerseSection href={`${process.env.TREASURES_URL ?? 'https://treasures.sdarm.life'}/${locale}`} />
      <ConnectedFooter locale={locale} />
    </>
  );
}
