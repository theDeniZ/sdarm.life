import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';
import HeroWelcome from '../components/HeroWelcome';
import NewsSection from '../components/NewsSection';
import ScriptureVerseSection from '../components/ScriptureVerseSection';
import { fetchTreasures, fetchSongbooks, WEB_URL, TREASURES_URL, SONGBOOK_URL, EVENTS_URL } from '../lib/api';
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

  const [bookRaw, songbooksRaw] = await Promise.all([fetchTreasures('type=book&limit=1'), fetchSongbooks()]);

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
      <HeroWelcome locale={locale} />
      <NewsSection newsData={newsData} />
      <ScriptureVerseSection href={`${TREASURES_URL}/${locale}`} locale={locale} />
      <ConnectedFooter locale={locale} />
    </>
  );
}
