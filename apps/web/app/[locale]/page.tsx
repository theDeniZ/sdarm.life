import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ConnectedNavbar, ConnectedFooter, siteHomeMetadata } from '@sdarm/ui';
import HeroWelcome from '../components/HeroWelcome';
import StatsGrid from '../components/StatsGrid';
import { fetchHomeLive } from '../lib/home-live';
import {
  API,
  fetchTreasures,
  fetchSongbooks,
  fetchConfig,
  WEB_URL,
  TREASURES_URL,
  SONGBOOK_URL,
  EVENTS_URL,
  SBL_URL,
} from '../lib/api';
import { parseGridConfig } from '@sdarm/types';
import type { NewsData } from '../lib/api';

export const dynamic = 'force-dynamic';

const BASE = WEB_URL;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.metadata' });
  return siteHomeMetadata({
    app: 'web',
    base: BASE,
    api: API,
    locale,
    title: t('title'),
    description: t('description'),
    ogTitle: t('ogTitle'),
    ogDescription: t('ogDescription'),
  });
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ screenshotDate?: string | string[] }>;
}) {
  const { locale } = await params;
  // ?screenshotDate=YYYY-MM-DD pins "today" for the live cards (lesson of the
  // week, Psalm of the day, song of the week) in screenshot tests.
  const dateParam = (await searchParams).screenshotDate;
  setRequestLocale(locale);

  const [bookRaw, songbooksRaw, config, live] = await Promise.all([
    fetchTreasures('type=book&limit=1'),
    fetchSongbooks(),
    fetchConfig(),
    fetchHomeLive(locale, Array.isArray(dateParam) ? dateParam[0] : dateParam),
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
    bibleUrl: `${TREASURES_URL}/${locale}/bible`,
    sblUrl: SBL_URL,
  };

  return (
    <>
      <ConnectedNavbar locale={locale} />
      <main id="main-content">
        <HeroWelcome locale={locale} />
        <StatsGrid newsData={newsData} grid={grid} live={live} apiUrl={API} />
      </main>
      <ConnectedFooter locale={locale} />
    </>
  );
}
