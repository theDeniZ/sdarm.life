import { setRequestLocale } from 'next-intl/server';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';
import HeroSection from '../components/HeroSection';
import NewsSection from '../components/NewsSection';
import ScriptureVerseSection from '../components/ScriptureVerseSection';
import UberUnsSection from '../components/UberUnsSection';
import { fetchPosts, fetchConfig, toHeroPost, r2url } from '../lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [featuredRaw, config] = await Promise.all([fetchPosts('featured=1'), fetchConfig()]);
  const heroPosts = featuredRaw?.map(toHeroPost) ?? [];
  const heroBgUrl = r2url(config?.hero_bg_key ?? null, { w: 1920, q: 85 });

  return (
    <>
      <ConnectedNavbar locale={locale} />
      <HeroSection posts={heroPosts} bgUrl={heroBgUrl} />
      <NewsSection />
      <ScriptureVerseSection href={`${process.env.TREASURES_URL ?? 'https://treasures.sdarm.life'}/${locale}`} />
      <UberUnsSection />
      <ConnectedFooter locale={locale} />
    </>
  );
}
