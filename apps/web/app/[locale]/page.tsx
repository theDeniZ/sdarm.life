import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';
import HeroWelcome from '../components/HeroWelcome';
import StatsGrid from '../components/StatsGrid';
import {
  fetchTreasures,
  fetchSongbooks,
  fetchConfig,
  WEB_URL,
  TREASURES_URL,
  SONGBOOK_URL,
  EVENTS_URL,
} from '../lib/api';
import { parseGridConfig } from '@sdarm/types';
import type { NewsData } from '../lib/api';

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

  const [bookRaw, songbooksRaw, config] = await Promise.all([
    fetchTreasures('type=book&limit=1'),
    fetchSongbooks(),
    fetchConfig(),
  ]);

  // A missing or malformed config falls back to the built-in defaults rather
  // than blanking the homepage.
  const grid = parseGridConfig(config?.home_grid);

  const newsData: NewsData = {
    book: bookRaw?.[0]
      ? { title: bookRaw[0].title, author: bookRaw[0].author, href: `${TREASURES_URL}/${locale}` }
      : null,
    song: songbooksRaw?.[0]
      ? { title: songbooksRaw[0].title, songCount: songbooksRaw[0].songCount, href: `${SONGBOOK_URL}/${locale}` }
      : null,
    eventsUrl: `${EVENTS_URL}/${locale}`,
    aboutUrl: `/${locale}/about`,
    youVersionUrl: 'https://www.bible.com/reading-plans',
  };

  return (
    <>
      <ConnectedNavbar locale={locale} />
      <main id="main-content">
        <HeroWelcome locale={locale} />
        <StatsGrid newsData={newsData} grid={grid} />
      </main>
      <ConnectedFooter locale={locale} />
    </>
  );
}
