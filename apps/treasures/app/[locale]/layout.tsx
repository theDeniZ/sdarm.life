import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@sdarm/i18n';
import type { Locale } from '@sdarm/i18n';
import { ConnectedNavbar, ThemeProvider, siteOpenGraph } from '@sdarm/ui';
import { API, SITE_URL } from '../lib/api';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'treasures.metadata' });
  // No canonical or og:url here — child pages would inherit the home page's.
  // The home page sets both (siteHomeMetadata).
  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    openGraph: siteOpenGraph({
      app: 'treasures',
      base: SITE_URL,
      api: API,
      locale,
      title: t('title'),
      description: t('description'),
    }),
    twitter: { card: 'summary_large_image' },
    icons: { icon: '/icon.svg' },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <>
      <ThemeProvider />
      <NextIntlClientProvider messages={messages}>
        <ConnectedNavbar locale={locale} />
        <main id="main-content">{children}</main>
      </NextIntlClientProvider>
    </>
  );
}
