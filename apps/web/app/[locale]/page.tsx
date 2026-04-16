import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';
import HeroSection from '../components/HeroSection';
import NewsSection from '../components/NewsSection';
import ScriptureVerseSection from '../components/ScriptureVerseSection';
import {
  fetchPosts,
  fetchConfig,
  toHeroPost,
  r2url,
  WEB_URL,
  TREASURES_URL,
  SONGBOOK_URL,
  EVENTS_URL,
} from '../lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const BASE = WEB_URL;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.metadata' });
  const canonical = `${BASE}/${locale}`;
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical,
      languages: { de: `${BASE}/de`, en: `${BASE}/en`, 'x-default': `${BASE}/de` },
    },
    openGraph: { type: 'website', url: canonical, title: t('title'), description: t('description') },
  };
}

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
      <NewsSection treasuresUrl={TREASURES_URL} songbookUrl={SONGBOOK_URL} eventsUrl={EVENTS_URL} />
      <ScriptureVerseSection href={`${TREASURES_URL}/${locale}`} locale={locale} />
      <ConnectedFooter locale={locale} />
    </>
  );
}
